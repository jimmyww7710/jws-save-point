---
title: "搞懂 Docker Network：bridge、host 與自訂網路"
description: "從容器之間為什麼連不到彼此開始，理解 Docker 的網路模式，以及在 Docker Compose 中如何設計服務之間的連線。"
category: "DevOps"
tags:
  - Docker
  - Networking
publishedAt: 2026-09-12
cover: "../../../assets/covers/docker-network.webp"
coverAlt: "藍色漸層與山形線條的抽象背景"
---

剛開始用 Docker 時，最常遇到的問題就是：「我的 API 容器為什麼連不到資料庫容器？」答案通常和網路模式有關。

## 三種常用網路模式

- **bridge**：預設模式，容器取得私有 IP，透過 NAT 對外。
- **host**：容器直接使用主機的網路堆疊，沒有隔離。
- **自訂 bridge 網路**：支援以**容器名稱**進行 DNS 解析，是多服務專案的首選。

## 用 Compose 建立自訂網路

```yaml
services:
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    networks: [backend]
  db:
    image: postgres:17
    networks: [backend]

networks:
  backend:
```

在 `api` 容器中，直接使用 `db` 這個主機名稱就能連到資料庫。

## 常用除錯指令

```bash
docker network ls
docker network inspect backend
docker exec -it api sh -c "nslookup db"
```

> 預設的 `bridge` 網路**不支援**以容器名稱解析，這是很多人踩到的第一個坑。
