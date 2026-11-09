---
title: "溢位overflow: 改用long long 作為變數型態"
slug: "c-type-long-long"
description: "變數的類型決定了能儲存資料大小的範圍"
category: "Backend"
tags:
  - C
publishedAt: "2026-11-09"
updatedAt: "2026-11-09"
cover: "../../../assets/covers/redis-cache.webp"
coverAlt: "紅色漸層抽象背景"
---

int 型態佔 4 Bytes(32 bits)。一個int能表示的範圍是從 2^31 - 1 到 -2^31。 (使用2的補數系統(Two's Complement)，MLB為判斷正負數，而 -1 的原因是為了留給0)。
一旦超過範圍，溢位會造成運算結果錯誤。

### 產生溢位overflow錯誤的例子

```c
#include <stdio.h>

int main()
{
  int i;
  printf("%zu\n", sizeof(i));
  scanf("%d", &i);
  printf("%d\n", i);
  i++;
  printf("%d\n", i);
  return 0;
}
```

溢位錯誤顯示 -2147483648

### 其他模式比較

```c
#include <stdio.h>

int main()
{
  long long i;
  printf("%zu\n", sizeof(i));
  scanf("%lld", &i);
  printf("%lld\n", i);
  i++;
  printf("%lld\n", i);
  return 0;
}
```
### 提前加上檢查

```c
#include <stdio.h>
#include <limits.h>

int main()
{
  int i = 2147483647;
  
  if (i == INT_MAX) {
    printf("Integer overflow would occur!\n");
  } else {
    i = i + 1;
    printf("%d\n", i)l;
  }
  return 0;
}
```

## 參考資料

- 由片語學習C程式設計 第二版
