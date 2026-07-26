# Jason Wave Index (JWI)

以**區塊高度**為唯一橫軸的比特幣週期指數圖表。

概念參考 [Wolfy Wave Index](https://github.com/wolfyxbt/wolfy-wave-index)，UI 與程式碼皆重新實作。

**線上預覽：** [https://2246250622.github.io/jason-wave-index/](https://2246250622.github.io/jason-wave-index/)

## 什麼是 Jason Wave Index？

Jason Wave Index（JWI）是一個純區塊高度驅動的比特幣週期位置指標：

- 唯一輸入：區塊高度
- 數值範圍：0 ~ 1
- `0` = 理論熊市底部
- `1` = 理論牛市頂部

### 模型假設

1. **週期錨定減半**：每 210,000 個區塊為一個完整週期
2. **牛三熊一**：每個週期牛市佔 157,500 塊，熊市佔 52,500 塊
3. **減半居中**：減半發生在牛市正中央

### 計算公式

```js
s = (height + 78750) % 210000

if (s < 157500) {
  JWI = s / 157500            // 牛市：0 → 1
} else {
  JWI = 1 - (s - 157500) / 52500  // 熊市：1 → 0
}
```

## 功能

- 區塊高度作為唯一 X 軸
- 主圖：BTC 價格（折線 / K 線）
- 副圖：Jason Wave Index（牛市青色 / 熊市紅色）
- 減半垂直線
- 未來推演虛線
- 日 / 週 / 月 資料聚合
- 對數 / 線性座標切換
- 中英文介面切換
- 深色 / 淺色主題
- Hover 資訊卡
- 即時價格與區塊高度更新

## 技術棧

- 純靜態網站（無框架、無建置步驟）
- [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
- 資料來源：Binance API + mempool.space

## 本地運行

```bash
python3 -m http.server 8080
```

然後開啟 [http://localhost:8080](http://localhost:8080)

> 注意：不能直接雙擊 `index.html` 開啟（`file://` 協議下無法載入資料）。

## 部署到 GitHub Pages

1. 推送程式碼到 GitHub
2. 進入 Repo → **Settings** → **Pages**
3. Source 選擇 `Deploy from a branch`
4. Branch 選 `main`，目錄選 `/ (root)`
5. 儲存後等待 1~2 分鐘即可訪問

## 專案結構

```
jason-wave-index/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── formula.js      # JWI 核心計算
│   ├── data.js         # 資料抓取
│   ├── chart.js        # 圖表邏輯
│   └── main.js         # 主程式
├── .nojekyll
└── README.md
```

## 作者

Jason（[@cheuk_baby](https://x.com/cheuk_baby)）

## License

MIT


