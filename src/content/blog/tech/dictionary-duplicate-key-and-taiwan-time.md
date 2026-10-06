---
title: "踩雷經驗: ToDictionary 重複鍵與 UTC 月份邊界"
description: "某個頁面在特定資料下整頁 500、月初統計數字少算，兩個問題都來自程式裡沒人保證的假設：鍵一定唯一、伺服器時間等於台灣時間。用範例說明成因與修正。"
category: "Backend"
tags:
  - C#
  - LINQ
  - EF Core
  - 時區
publishedAt: 2026-10-05
---

Code Review 時抓到兩個看似無關的問題，根源卻相同：**程式悄悄做了一個沒人保證的假設**。一個是「鍵不會重複」，一個是「伺服器時間等於台灣時間」。

## 問題一：ToDictionary 遇到重複鍵，整頁 500

### 情境

以「訂單 + 月份」為鍵，把資料轉成字典方便比對：

```csharp
var byKey = orders.ToDictionary(o => (o.CustomerId, o.StartDate.Date));
```

### 為什麼會出事

`ToDictionary` 只要兩筆資料的鍵相同，就直接拋 `ArgumentException`。

資料來自資料庫查詢，查詢是用 `CustomerId + StartDate + EndDate` 分組的，所以這兩筆在資料庫端算「不同組」，各輸出一列：

| CustomerId | StartDate | EndDate | Amount |
| --- | --- | --- | --- |
| 1 | 2026-09-01 00:00 | 2026-09-30 | 100 |
| 1 | 2026-09-01 08:00 | 2026-09-15 | 50 |

但字典的鍵是 `(CustomerId, StartDate.Date)`，時間被截掉後，兩列都變成 `(1, 2026-09-01)`：

```
第 1 筆 → 鍵 (1, 2026-09-01)  ✔ 加入
第 2 筆 → 鍵 (1, 2026-09-01)  ✘ 已存在 → ArgumentException → API 回 500
```
而且壞掉的不只那一筆，是整頁都看不到。

「一個月只會有一筆」這個前提只靠前端表單保證，API 沒驗證、資料庫也沒有唯一限制，直接打 API 或舊資料就會踩雷。

### 怎麼修

原則：**字典的鍵是什麼，就先用那個鍵 `GroupBy`，再轉字典**。同一個月的多筆本來就該合併（加總）後再比較：

```csharp
var byKey = orders
    .GroupBy(o => (o.CustomerId, o.StartDate.Date))
    .ToDictionary(
        g => g.Key,
        g => new Order
        {
            CustomerId = g.Key.CustomerId,
            StartDate = g.Key.Date,
            EndDate = g.Max(o => o.EndDate),
            Amount = g.Sum(o => o.Amount),
        });
```

套用到上面的範例：

```
GroupBy → (1, 2026-09-01) 底下有 2 筆
結果   → { (1, 2026-09-01): Amount = 150, EndDate = 2026-09-30 }
```

`GroupBy` 保證鍵唯一，之後不可能再重複；加總也讓「同月多筆」的語意正確，而不是隨便挑一筆。

至於資料庫那層的查詢，因為還有別的功能依賴原本的分組，所以不動，只在這個功能用到的地方合併，影響範圍最小。

## 問題二：用 UtcNow 判斷「當月」，月初月底差 8 小時

### 情境

要找出「到當月為止」還沒完成的月份，尚未到來的月份不能算：

```csharp
DateTime currentMonthStart = new(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
```

### 為什麼會出事

伺服器跑在 UTC，與台灣（UTC+8）差 8 小時。假設台灣時間是：

| 台灣時間 | UTC 時間 | 程式算出的「當月」 | 實際應為 |
| --- | --- | --- | --- |
| 10/1 03:00 | 9/30 19:00 | **9 月** ✘ | 10 月 |
| 9/30 18:00 | 9/30 10:00 | 9 月 ✔ | 9 月 |
| 9/30 23:00 | 9/30 15:00 | 9 月 ✔ | 9 月 |
| 10/1 00:00 | 9/30 16:00 | **9 月** ✘ | 10 月 |

結果是：每月 1 日 00:00–08:00 這段時間，「當月」還停在上個月，新月份被排除，月初早上少了一批資料。（若反向以「下個月」判斷，月底晚上則會提前多出尚未到期的項目。）

### 怎麼修

台灣沒有日光節約時間，直接加固定 8 小時最單純，也避開時區 ID 在 Windows（`Taipei Standard Time`）與 Linux（`Asia/Taipei`）不同的問題：

```csharp
DateTime taiwanNow = DateTime.UtcNow.AddHours(8);
DateTime currentMonthStart = new(taiwanNow.Year, taiwanNow.Month, 1);
```

同樣是 UTC 10/1 的前一刻：

```
UTC 9/30 19:00 → +8 → 台灣 10/1 03:00 → 當月 = 10 月 ✔
```

### 哪些該改、哪些不該改

資料庫的時間戳記（`CreatedAt`、`UpdatedAt`）存 UTC 是對的，不用動。要改的是「**用時間做月份、年度的業務判斷**」：

- **本月統計**：資料庫存 UTC，所以不能只把 `now` 換成台灣時間，要先算出**台灣月初**，再減 8 小時換回 UTC 當查詢邊界：

  ```
  台灣月初   2026-10-01 00:00
  UTC 邊界   2026-09-30 16:00   ← WHERE CreatedAt >= 這個值
  ```

- **可查詢的最後年度**：改用台灣時間的年份，避免跨年夜 00:00–08:00 查不到新年度。

## 小結

| | 舊做法 | 風險 | 新做法 |
| --- | --- | --- | --- |
| 字典鍵 | 直接 `ToDictionary` | 重複鍵拋例外、整頁 500 | 先用同一個鍵 `GroupBy` 合併，再轉字典 |
| 當月判斷 | `DateTime.UtcNow` | 月初月底差 8 小時 | `UtcNow.AddHours(8)` 取台灣時間 |
| 查詢邊界 | 以 UTC 月初為界 | 與台灣月份錯位 | 台灣月初換算回 UTC |

結論：

1. **`ToDictionary` 之前先問：這個鍵真的唯一嗎？** 如果唯一性只靠前端或慣例，就先 `GroupBy`。
2. **「儲存用 UTC」與「業務判斷用當地時間」是兩件事。** 儲存維持 UTC；凡涉及「這個月、這一年」的判斷，都要明確換算時區，查詢邊界也要換算回 UTC。
