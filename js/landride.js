// landride.js — 首頁那一段 18 秒循環的資料與圖。
//
// ⚠⚠⚠ **這個檔是 `python tools/landgen.py` 生出來的。不要手改。** ⚠⚠⚠
//
// 要改就改 `tools/landgen.py` 的 `B_BEATS` / `B_QUEUES` / `B_ALL_GROUPS`，
// 改完重跑一次。
//
// 下面的 `LAND_SRC` 是產生當下從 `content.js` / `sprites.js` / `interior.js` /
// `theme.js` 讀到的**每一筆資料原樣**。驗收第 25 組拿活的模組
// 再算一份來逐字元比：**BE 改了 `townhall.hours` 而沒有重新生成 → harness 紅。**

export const RIDE = {
  "loop": 18.0,
  "view": {
    "w": 448,
    "h": 420,
    "total": 1586
  },
  "beats": [
    {
      "i": 0,
      "t0": 0.0,
      "t1": 2.2,
      "floor": 1,
      "place": "lobby",
      "band": "retail",
      "clock": "10:05",
      "total": 19,
      "ev": {
        "id": "anniversary",
        "name": "週年慶開門",
        "n": [
          14,
          24
        ],
        "at": "lobby",
        "to": "retail",
        "hours": [
          10,
          12
        ]
      }
    },
    {
      "i": 1,
      "t0": 4.4,
      "t1": 7.6,
      "floor": 13,
      "place": "office",
      "band": "office",
      "clock": "09:05",
      "total": 19,
      "ev": {
        "id": "townhall",
        "name": "全員大會",
        "n": [
          14,
          24
        ],
        "at": "office",
        "to": "office",
        "hours": [
          9,
          11
        ]
      }
    },
    {
      "i": 2,
      "t0": 10.0,
      "t1": 13.2,
      "floor": 79,
      "place": "obs",
      "band": "obs",
      "clock": "22:40",
      "total": 23,
      "ev": {
        "id": "deckclose",
        "name": "觀景台清場",
        "n": [
          18,
          28
        ],
        "at": "obs",
        "to": "lobby",
        "hours": [
          22,
          24
        ]
      }
    },
    {
      "i": 3,
      "t0": 15.2,
      "t1": 18.0,
      "floor": 93,
      "place": "exp",
      "band": "exp",
      "clock": "22:10",
      "total": 5,
      "ev": {
        "id": "handover",
        "name": "夜班交接",
        "n": [
          4,
          7
        ],
        "at": "exp",
        "to": "exp",
        "hours": [
          22,
          24
        ]
      }
    }
  ]
};

export const RIDE_SVG = "<svg class=\"rideSvg\" viewBox=\"0 0 448 1586\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><g class=\"rideCam\"><defs></defs><rect x=\"6\" y=\"56\" width=\"436\" height=\"1524\" fill=\"#2a3142\"/><rect x=\"6\" y=\"56\" width=\"436\" height=\"43\" fill=\"#482d3a\"/><rect x=\"6\" y=\"56\" width=\"10\" height=\"43\" fill=\"#d485aa\"/><path fill=\"#835269\" d=\"M24 89h10v2h-10zM38 89h2v2h-2zM48 89h2v2h-2zM24 91h10v2h-10zM38 91h2v2h-2zM48 91h2v2h-2zM24 95h2v2h-2zM44 95h2v2h-2z\"/><rect x=\"20\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M28 85h2v2h-2zM42 85h4v2h-4zM26 87h6v2h-6zM42 87h4v2h-4zM42 89h4v2h-4zM42 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M68 89h10v2h-10zM82 89h2v2h-2zM92 89h2v2h-2zM68 91h10v2h-10zM82 91h2v2h-2zM92 91h2v2h-2zM68 95h2v2h-2zM88 95h2v2h-2z\"/><rect x=\"64\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M72 85h2v2h-2zM86 85h4v2h-4zM70 87h6v2h-6zM86 87h4v2h-4zM86 89h4v2h-4zM86 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M112 89h10v2h-10zM126 89h2v2h-2zM136 89h2v2h-2zM112 91h10v2h-10zM126 91h2v2h-2zM136 91h2v2h-2zM112 95h2v2h-2zM132 95h2v2h-2z\"/><rect x=\"108\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M116 85h2v2h-2zM130 85h4v2h-4zM114 87h6v2h-6zM130 87h4v2h-4zM130 89h4v2h-4zM130 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M156 89h10v2h-10zM170 89h2v2h-2zM180 89h2v2h-2zM156 91h10v2h-10zM170 91h2v2h-2zM180 91h2v2h-2zM156 95h2v2h-2zM176 95h2v2h-2z\"/><rect x=\"152\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M160 85h2v2h-2zM174 85h4v2h-4zM158 87h6v2h-6zM174 87h4v2h-4zM174 89h4v2h-4zM174 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M200 89h10v2h-10zM214 89h2v2h-2zM224 89h2v2h-2zM200 91h10v2h-10zM214 91h2v2h-2zM224 91h2v2h-2zM200 95h2v2h-2zM220 95h2v2h-2z\"/><rect x=\"196\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M204 85h2v2h-2zM218 85h4v2h-4zM202 87h6v2h-6zM218 87h4v2h-4zM218 89h4v2h-4zM218 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M244 89h10v2h-10zM258 89h2v2h-2zM268 89h2v2h-2zM244 91h10v2h-10zM258 91h2v2h-2zM268 91h2v2h-2zM244 95h2v2h-2zM264 95h2v2h-2z\"/><rect x=\"240\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M248 85h2v2h-2zM262 85h4v2h-4zM246 87h6v2h-6zM262 87h4v2h-4zM262 89h4v2h-4zM262 91h4v2h-4z\"/><path fill=\"#835269\" d=\"M288 89h10v2h-10zM302 89h2v2h-2zM312 89h2v2h-2zM288 91h10v2h-10zM302 91h2v2h-2zM312 91h2v2h-2zM288 95h2v2h-2zM308 95h2v2h-2z\"/><rect x=\"284\" y=\"93\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M292 85h2v2h-2zM306 85h4v2h-4zM290 87h6v2h-6zM306 87h4v2h-4zM306 89h4v2h-4zM306 91h4v2h-4z\"/><rect x=\"16\" y=\"68\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 70.5h9v3h-9zM18 73.5h3v3h-3zM24 73.5h3v3h-3zM18 76.5h9v3h-9zM24 79.5h3v3h-3zM18 82.5h9v3h-9zM30 70.5h9v3h-9zM36 73.5h3v3h-3zM30 76.5h9v3h-9zM36 79.5h3v3h-3zM30 82.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 62h9v3h-9zM300 65h3v3h-3zM294 68h15v3h-15zM294 71h12v3h-12zM294 74h12v3h-12zM291 77h21v3h-21zM291 80h21v3h-21zM294 83h15v3h-15z\"/><path fill=\"#00dbe0\" d=\"M294 59h15v3h-15zM306 71h6v3h-6zM306 74h6v3h-6z\"/><rect x=\"314\" y=\"71\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M316 73h6v2h-6zM316 75h2v2h-2zM320 75h2v2h-2zM316 77h6v2h-6zM320 79h2v2h-2zM316 81h6v2h-6zM324 73h6v2h-6zM328 75h2v2h-2zM324 77h6v2h-6zM328 79h2v2h-2zM324 81h6v2h-6z\"/><rect x=\"295.5\" y=\"55\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"55\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#e2645a\" d=\"M254 59h9v3h-9zM242 62h3v3h-3zM254 62h9v3h-9zM242 65h3v3h-3zM257 65h3v3h-3zM254 68h9v3h-9zM254 71h9v3h-9zM254 74h9v3h-9zM254 77h3v3h-3zM260 77h3v3h-3zM254 80h3v3h-3zM260 80h3v3h-3zM257 83h6v3h-6z\"/><path fill=\"#558655\" d=\"M242 68h12v3h-12zM242 71h3v3h-3zM251 71h3v3h-3zM242 74h12v3h-12zM242 77h3v3h-3zM251 77h3v3h-3zM242 80h12v3h-12zM242 83h3v3h-3zM248 83h3v3h-3z\"/><path fill=\"#e2645a\" d=\"M260 47h3v6h-3zM260 56h3v3h-3z\"/><rect x=\"265\" y=\"71\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#e2645a\" d=\"M267 73h6v2h-6zM267 75h2v2h-2zM271 75h2v2h-2zM267 77h6v2h-6zM271 79h2v2h-2zM267 81h6v2h-6zM275 73h6v2h-6zM279 75h2v2h-2zM275 77h6v2h-6zM279 79h2v2h-2zM275 81h6v2h-6z\"/><rect x=\"246.5\" y=\"55\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"55\" width=\"2.16\" height=\"2\" fill=\"#e2645a\"/><path fill=\"#eaf0fb\" d=\"M199 62h9v3h-9zM202 65h3v3h-3zM196 68h15v3h-15zM196 71h12v3h-12zM196 74h12v3h-12zM193 77h21v3h-21zM193 80h21v3h-21zM196 83h15v3h-15z\"/><path fill=\"#00dbe0\" d=\"M196 59h15v3h-15zM208 71h6v3h-6zM208 74h6v3h-6z\"/><rect x=\"216\" y=\"71\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M218 73h6v2h-6zM218 75h2v2h-2zM222 75h2v2h-2zM218 77h6v2h-6zM222 79h2v2h-2zM218 81h6v2h-6zM226 73h6v2h-6zM230 75h2v2h-2zM226 77h6v2h-6zM230 79h2v2h-2zM226 81h6v2h-6z\"/><rect x=\"197.5\" y=\"55\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"197.5\" y=\"55\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M150 59h9v3h-9zM150 62h9v3h-9zM153 65h3v3h-3zM147 68h15v3h-15zM147 71h15v3h-15zM147 74h15v3h-15zM147 77h15v3h-15zM150 80h3v3h-3zM156 80h3v3h-3zM150 83h3v3h-3zM156 83h3v3h-3z\"/><path fill=\"#729cae\" d=\"M162 71h3v3h-3zM162 74h3v3h-3z\"/><rect x=\"167\" y=\"71\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M169 73h6v2h-6zM169 75h2v2h-2zM173 75h2v2h-2zM169 77h6v2h-6zM173 79h2v2h-2zM169 81h6v2h-6zM177 73h6v2h-6zM181 75h2v2h-2zM177 77h6v2h-6zM181 79h2v2h-2zM177 81h6v2h-6z\"/><rect x=\"148.5\" y=\"55\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"148.5\" y=\"55\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><path fill=\"#eaf0fb\" d=\"M101 59h9v3h-9zM101 62h9v3h-9zM104 65h3v3h-3zM98 68h12v3h-12zM98 71h12v3h-12zM98 74h12v3h-12zM101 77h3v3h-3zM107 77h3v3h-3zM101 80h3v3h-3zM107 80h3v3h-3zM101 83h3v3h-3zM107 83h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M110 71h6v3h-6zM110 74h6v3h-6z\"/><rect x=\"118\" y=\"71\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M122 73h2v2h-2zM120 75h4v2h-4zM122 77h2v2h-2zM122 79h2v2h-2zM120 81h6v2h-6z\"/><rect x=\"99.5\" y=\"55\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"99.5\" y=\"55\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><rect x=\"6\" y=\"100\" width=\"436\" height=\"43\" fill=\"#3d2631\"/><rect x=\"6\" y=\"100\" width=\"10\" height=\"43\" fill=\"#d485aa\"/><path fill=\"#835269\" d=\"M24 133h10v2h-10zM38 133h2v2h-2zM48 133h2v2h-2zM24 135h10v2h-10zM38 135h2v2h-2zM48 135h2v2h-2zM24 139h2v2h-2zM44 139h2v2h-2z\"/><rect x=\"20\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M28 129h2v2h-2zM42 129h4v2h-4zM26 131h6v2h-6zM42 131h4v2h-4zM42 133h4v2h-4zM42 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M68 133h10v2h-10zM82 133h2v2h-2zM92 133h2v2h-2zM68 135h10v2h-10zM82 135h2v2h-2zM92 135h2v2h-2zM68 139h2v2h-2zM88 139h2v2h-2z\"/><rect x=\"64\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M72 129h2v2h-2zM86 129h4v2h-4zM70 131h6v2h-6zM86 131h4v2h-4zM86 133h4v2h-4zM86 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M112 133h10v2h-10zM126 133h2v2h-2zM136 133h2v2h-2zM112 135h10v2h-10zM126 135h2v2h-2zM136 135h2v2h-2zM112 139h2v2h-2zM132 139h2v2h-2z\"/><rect x=\"108\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M116 129h2v2h-2zM130 129h4v2h-4zM114 131h6v2h-6zM130 131h4v2h-4zM130 133h4v2h-4zM130 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M156 133h10v2h-10zM170 133h2v2h-2zM180 133h2v2h-2zM156 135h10v2h-10zM170 135h2v2h-2zM180 135h2v2h-2zM156 139h2v2h-2zM176 139h2v2h-2z\"/><rect x=\"152\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M160 129h2v2h-2zM174 129h4v2h-4zM158 131h6v2h-6zM174 131h4v2h-4zM174 133h4v2h-4zM174 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M200 133h10v2h-10zM214 133h2v2h-2zM224 133h2v2h-2zM200 135h10v2h-10zM214 135h2v2h-2zM224 135h2v2h-2zM200 139h2v2h-2zM220 139h2v2h-2z\"/><rect x=\"196\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M204 129h2v2h-2zM218 129h4v2h-4zM202 131h6v2h-6zM218 131h4v2h-4zM218 133h4v2h-4zM218 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M244 133h10v2h-10zM258 133h2v2h-2zM268 133h2v2h-2zM244 135h10v2h-10zM258 135h2v2h-2zM268 135h2v2h-2zM244 139h2v2h-2zM264 139h2v2h-2z\"/><rect x=\"240\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M248 129h2v2h-2zM262 129h4v2h-4zM246 131h6v2h-6zM262 131h4v2h-4zM262 133h4v2h-4zM262 135h4v2h-4z\"/><path fill=\"#835269\" d=\"M288 133h10v2h-10zM302 133h2v2h-2zM312 133h2v2h-2zM288 135h10v2h-10zM302 135h2v2h-2zM312 135h2v2h-2zM288 139h2v2h-2zM308 139h2v2h-2z\"/><rect x=\"284\" y=\"137\" width=\"30\" height=\"2\" fill=\"#bd7798\"/><path fill=\"#7dd8f7\" d=\"M292 129h2v2h-2zM306 129h4v2h-4zM290 131h6v2h-6zM306 131h4v2h-4zM306 133h4v2h-4zM306 135h4v2h-4z\"/><rect x=\"16\" y=\"112\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 114.5h9v3h-9zM18 117.5h3v3h-3zM24 117.5h3v3h-3zM18 120.5h9v3h-9zM24 123.5h3v3h-3zM18 126.5h9v3h-9zM30 114.5h9v3h-9zM36 117.5h3v3h-3zM30 120.5h9v3h-9zM30 123.5h3v3h-3zM30 126.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 103h9v3h-9zM297 106h9v3h-9zM300 109h3v3h-3zM294 112h15v3h-15zM294 115h15v3h-15zM294 118h15v3h-15zM294 121h15v3h-15zM297 124h3v3h-3zM303 124h3v3h-3zM297 127h3v3h-3zM303 127h3v3h-3z\"/><path fill=\"#729cae\" d=\"M309 115h3v3h-3zM309 118h3v3h-3z\"/><rect x=\"314\" y=\"115\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M316 117h6v2h-6zM316 119h2v2h-2zM320 119h2v2h-2zM316 121h6v2h-6zM320 123h2v2h-2zM316 125h6v2h-6zM324 117h6v2h-6zM328 119h2v2h-2zM324 121h6v2h-6zM328 123h2v2h-2zM324 125h6v2h-6z\"/><rect x=\"295.5\" y=\"99\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"99\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M245 103h15v3h-15zM242 106h3v3h-3zM260 106h3v3h-3zM242 109h3v3h-3zM260 109h3v3h-3zM242 112h21v3h-21zM242 115h21v3h-21zM245 118h15v3h-15zM245 121h15v3h-15zM245 124h6v3h-6zM254 124h6v3h-6zM245 127h6v3h-6zM254 127h6v3h-6z\"/><path fill=\"#7bbc04\" d=\"M245 106h15v3h-15zM245 109h15v3h-15z\"/><rect x=\"265\" y=\"115\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M267 117h6v2h-6zM267 119h2v2h-2zM271 119h2v2h-2zM267 121h6v2h-6zM271 123h2v2h-2zM267 125h6v2h-6zM275 117h6v2h-6zM279 119h2v2h-2zM275 121h6v2h-6zM279 123h2v2h-2zM275 125h6v2h-6z\"/><rect x=\"246.5\" y=\"99\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"99\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"143\" width=\"436\" height=\"121\" fill=\"#2a3142\"/><rect x=\"9\" y=\"154\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"170\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"186\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"202\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"218\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"234\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"250\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><path fill=\"#8f9ab5\" d=\"M168.5 194h3v3h-3zM165.5 197h6v3h-6zM168.5 200h3v3h-3zM168.5 203h3v3h-3zM165.5 206h9v3h-9zM177.5 194h9v3h-9zM177.5 197h3v3h-3zM183.5 197h3v3h-3zM177.5 200h3v3h-3zM183.5 200h3v3h-3zM177.5 203h3v3h-3zM183.5 203h3v3h-3zM177.5 206h9v3h-9z\"/><rect x=\"146\" y=\"216\" width=\"60\" height=\"2\" fill=\"#8f9ab5\" opacity=\".45\"/><rect x=\"6\" y=\"264\" width=\"436\" height=\"43\" fill=\"#2d4257\"/><rect x=\"6\" y=\"264\" width=\"10\" height=\"43\" fill=\"#85c3ff\"/><path fill=\"#52799f\" d=\"M40 297h8v2h-8zM26 299h2v2h-2zM40 299h2v2h-2zM46 299h2v2h-2zM26 301h2v2h-2zM40 301h2v2h-2zM46 301h2v2h-2zM24 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M30 295h2v2h-2zM28 297h4v2h-4zM28 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M20 291h32v2h-32zM20 293h2v2h-2zM50 293h2v2h-2zM20 295h2v2h-2zM50 295h2v2h-2zM20 297h2v2h-2zM50 297h2v2h-2zM20 299h2v2h-2zM50 299h2v2h-2zM20 301h2v2h-2zM50 301h2v2h-2zM20 303h2v2h-2zM50 303h2v2h-2zM20 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M84 297h8v2h-8zM70 299h2v2h-2zM84 299h2v2h-2zM90 299h2v2h-2zM70 301h2v2h-2zM84 301h2v2h-2zM90 301h2v2h-2zM68 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M74 295h2v2h-2zM72 297h4v2h-4zM72 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M64 291h32v2h-32zM64 293h2v2h-2zM94 293h2v2h-2zM64 295h2v2h-2zM94 295h2v2h-2zM64 297h2v2h-2zM94 297h2v2h-2zM64 299h2v2h-2zM94 299h2v2h-2zM64 301h2v2h-2zM94 301h2v2h-2zM64 303h2v2h-2zM94 303h2v2h-2zM64 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M128 297h8v2h-8zM114 299h2v2h-2zM128 299h2v2h-2zM134 299h2v2h-2zM114 301h2v2h-2zM128 301h2v2h-2zM134 301h2v2h-2zM112 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M118 295h2v2h-2zM116 297h4v2h-4zM116 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M108 291h32v2h-32zM108 293h2v2h-2zM138 293h2v2h-2zM108 295h2v2h-2zM138 295h2v2h-2zM108 297h2v2h-2zM138 297h2v2h-2zM108 299h2v2h-2zM138 299h2v2h-2zM108 301h2v2h-2zM138 301h2v2h-2zM108 303h2v2h-2zM138 303h2v2h-2zM108 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M172 297h8v2h-8zM158 299h2v2h-2zM172 299h2v2h-2zM178 299h2v2h-2zM158 301h2v2h-2zM172 301h2v2h-2zM178 301h2v2h-2zM156 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M162 295h2v2h-2zM160 297h4v2h-4zM160 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M152 291h32v2h-32zM152 293h2v2h-2zM182 293h2v2h-2zM152 295h2v2h-2zM182 295h2v2h-2zM152 297h2v2h-2zM182 297h2v2h-2zM152 299h2v2h-2zM182 299h2v2h-2zM152 301h2v2h-2zM182 301h2v2h-2zM152 303h2v2h-2zM182 303h2v2h-2zM152 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M216 297h8v2h-8zM202 299h2v2h-2zM216 299h2v2h-2zM222 299h2v2h-2zM202 301h2v2h-2zM216 301h2v2h-2zM222 301h2v2h-2zM200 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M206 295h2v2h-2zM204 297h4v2h-4zM204 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M196 291h32v2h-32zM196 293h2v2h-2zM226 293h2v2h-2zM196 295h2v2h-2zM226 295h2v2h-2zM196 297h2v2h-2zM226 297h2v2h-2zM196 299h2v2h-2zM226 299h2v2h-2zM196 301h2v2h-2zM226 301h2v2h-2zM196 303h2v2h-2zM226 303h2v2h-2zM196 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M260 297h8v2h-8zM246 299h2v2h-2zM260 299h2v2h-2zM266 299h2v2h-2zM246 301h2v2h-2zM260 301h2v2h-2zM266 301h2v2h-2zM244 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M250 295h2v2h-2zM248 297h4v2h-4zM248 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M240 291h32v2h-32zM240 293h2v2h-2zM270 293h2v2h-2zM240 295h2v2h-2zM270 295h2v2h-2zM240 297h2v2h-2zM270 297h2v2h-2zM240 299h2v2h-2zM270 299h2v2h-2zM240 301h2v2h-2zM270 301h2v2h-2zM240 303h2v2h-2zM270 303h2v2h-2zM240 305h32v2h-32z\"/><path fill=\"#52799f\" d=\"M304 297h8v2h-8zM290 299h2v2h-2zM304 299h2v2h-2zM310 299h2v2h-2zM290 301h2v2h-2zM304 301h2v2h-2zM310 301h2v2h-2zM288 303h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M294 295h2v2h-2zM292 297h4v2h-4zM292 299h2v2h-2z\"/><path fill=\"#51779d\" d=\"M284 291h32v2h-32zM284 293h2v2h-2zM314 293h2v2h-2zM284 295h2v2h-2zM314 295h2v2h-2zM284 297h2v2h-2zM314 297h2v2h-2zM284 299h2v2h-2zM314 299h2v2h-2zM284 301h2v2h-2zM314 301h2v2h-2zM284 303h2v2h-2zM314 303h2v2h-2zM284 305h32v2h-32z\"/><rect x=\"16\" y=\"276\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 278.5h9v3h-9zM18 281.5h3v3h-3zM24 281.5h3v3h-3zM18 284.5h9v3h-9zM18 287.5h3v3h-3zM24 287.5h3v3h-3zM18 290.5h9v3h-9zM33 278.5h3v3h-3zM30 281.5h6v3h-6zM33 284.5h3v3h-3zM33 287.5h3v3h-3zM30 290.5h9v3h-9z\"/><rect x=\"6\" y=\"308\" width=\"436\" height=\"43\" fill=\"#26384a\"/><rect x=\"6\" y=\"308\" width=\"10\" height=\"43\" fill=\"#85c3ff\"/><path fill=\"#52799f\" d=\"M40 341h8v2h-8zM26 343h2v2h-2zM40 343h2v2h-2zM46 343h2v2h-2zM26 345h2v2h-2zM40 345h2v2h-2zM46 345h2v2h-2zM24 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M30 339h2v2h-2zM28 341h4v2h-4zM28 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M20 335h32v2h-32zM20 337h2v2h-2zM50 337h2v2h-2zM20 339h2v2h-2zM50 339h2v2h-2zM20 341h2v2h-2zM50 341h2v2h-2zM20 343h2v2h-2zM50 343h2v2h-2zM20 345h2v2h-2zM50 345h2v2h-2zM20 347h2v2h-2zM50 347h2v2h-2zM20 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M84 341h8v2h-8zM70 343h2v2h-2zM84 343h2v2h-2zM90 343h2v2h-2zM70 345h2v2h-2zM84 345h2v2h-2zM90 345h2v2h-2zM68 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M74 339h2v2h-2zM72 341h4v2h-4zM72 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M64 335h32v2h-32zM64 337h2v2h-2zM94 337h2v2h-2zM64 339h2v2h-2zM94 339h2v2h-2zM64 341h2v2h-2zM94 341h2v2h-2zM64 343h2v2h-2zM94 343h2v2h-2zM64 345h2v2h-2zM94 345h2v2h-2zM64 347h2v2h-2zM94 347h2v2h-2zM64 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M128 341h8v2h-8zM114 343h2v2h-2zM128 343h2v2h-2zM134 343h2v2h-2zM114 345h2v2h-2zM128 345h2v2h-2zM134 345h2v2h-2zM112 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M118 339h2v2h-2zM116 341h4v2h-4zM116 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M108 335h32v2h-32zM108 337h2v2h-2zM138 337h2v2h-2zM108 339h2v2h-2zM138 339h2v2h-2zM108 341h2v2h-2zM138 341h2v2h-2zM108 343h2v2h-2zM138 343h2v2h-2zM108 345h2v2h-2zM138 345h2v2h-2zM108 347h2v2h-2zM138 347h2v2h-2zM108 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M172 341h8v2h-8zM158 343h2v2h-2zM172 343h2v2h-2zM178 343h2v2h-2zM158 345h2v2h-2zM172 345h2v2h-2zM178 345h2v2h-2zM156 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M162 339h2v2h-2zM160 341h4v2h-4zM160 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M152 335h32v2h-32zM152 337h2v2h-2zM182 337h2v2h-2zM152 339h2v2h-2zM182 339h2v2h-2zM152 341h2v2h-2zM182 341h2v2h-2zM152 343h2v2h-2zM182 343h2v2h-2zM152 345h2v2h-2zM182 345h2v2h-2zM152 347h2v2h-2zM182 347h2v2h-2zM152 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M216 341h8v2h-8zM202 343h2v2h-2zM216 343h2v2h-2zM222 343h2v2h-2zM202 345h2v2h-2zM216 345h2v2h-2zM222 345h2v2h-2zM200 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M206 339h2v2h-2zM204 341h4v2h-4zM204 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M196 335h32v2h-32zM196 337h2v2h-2zM226 337h2v2h-2zM196 339h2v2h-2zM226 339h2v2h-2zM196 341h2v2h-2zM226 341h2v2h-2zM196 343h2v2h-2zM226 343h2v2h-2zM196 345h2v2h-2zM226 345h2v2h-2zM196 347h2v2h-2zM226 347h2v2h-2zM196 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M260 341h8v2h-8zM246 343h2v2h-2zM260 343h2v2h-2zM266 343h2v2h-2zM246 345h2v2h-2zM260 345h2v2h-2zM266 345h2v2h-2zM244 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M250 339h2v2h-2zM248 341h4v2h-4zM248 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M240 335h32v2h-32zM240 337h2v2h-2zM270 337h2v2h-2zM240 339h2v2h-2zM270 339h2v2h-2zM240 341h2v2h-2zM270 341h2v2h-2zM240 343h2v2h-2zM270 343h2v2h-2zM240 345h2v2h-2zM270 345h2v2h-2zM240 347h2v2h-2zM270 347h2v2h-2zM240 349h32v2h-32z\"/><path fill=\"#52799f\" d=\"M304 341h8v2h-8zM290 343h2v2h-2zM304 343h2v2h-2zM310 343h2v2h-2zM290 345h2v2h-2zM304 345h2v2h-2zM310 345h2v2h-2zM288 347h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M294 339h2v2h-2zM292 341h4v2h-4zM292 343h2v2h-2z\"/><path fill=\"#51779d\" d=\"M284 335h32v2h-32zM284 337h2v2h-2zM314 337h2v2h-2zM284 339h2v2h-2zM314 339h2v2h-2zM284 341h2v2h-2zM314 341h2v2h-2zM284 343h2v2h-2zM314 343h2v2h-2zM284 345h2v2h-2zM314 345h2v2h-2zM284 347h2v2h-2zM314 347h2v2h-2zM284 349h32v2h-32z\"/><rect x=\"16\" y=\"320\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 322.5h9v3h-9zM18 325.5h3v3h-3zM24 325.5h3v3h-3zM18 328.5h9v3h-9zM18 331.5h3v3h-3zM24 331.5h3v3h-3zM18 334.5h9v3h-9zM30 322.5h9v3h-9zM30 325.5h3v3h-3zM36 325.5h3v3h-3zM30 328.5h3v3h-3zM36 328.5h3v3h-3zM30 331.5h3v3h-3zM36 331.5h3v3h-3zM30 334.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 311h9v3h-9zM300 317h3v3h-3zM294 320h15v3h-15zM294 323h15v3h-15zM294 326h15v3h-15zM297 329h3v3h-3zM303 329h3v3h-3zM297 332h3v3h-3zM303 332h3v3h-3zM297 335h3v3h-3zM303 335h3v3h-3z\"/><rect x=\"294\" y=\"314\" width=\"15\" height=\"3\" fill=\"#d2ae12\"/><rect x=\"314\" y=\"323\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 325h2v2h-2zM316 327h4v2h-4zM318 329h2v2h-2zM318 331h2v2h-2zM316 333h6v2h-6z\"/><rect x=\"295.5\" y=\"307\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"307\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M245 314h12v3h-12zM248 317h6v3h-6zM248 320h6v3h-6zM248 323h9v3h-9zM248 326h9v3h-9zM248 329h6v3h-6zM248 332h3v3h-3zM254 332h3v3h-3zM248 335h3v3h-3zM254 335h3v3h-3z\"/><path fill=\"#73cbb7\" d=\"M242 323h6v3h-6zM242 326h6v3h-6zM242 329h6v3h-6z\"/><rect x=\"265\" y=\"323\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 325h2v2h-2zM267 327h4v2h-4zM269 329h2v2h-2zM269 331h2v2h-2zM267 333h6v2h-6z\"/><rect x=\"246.5\" y=\"307\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"307\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"352\" width=\"436\" height=\"43\" fill=\"#2d4257\"/><rect x=\"6\" y=\"352\" width=\"10\" height=\"43\" fill=\"#85c3ff\"/><path fill=\"#52799f\" d=\"M40 385h8v2h-8zM26 387h2v2h-2zM40 387h2v2h-2zM46 387h2v2h-2zM26 389h2v2h-2zM40 389h2v2h-2zM46 389h2v2h-2zM24 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M30 383h2v2h-2zM28 385h4v2h-4zM28 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M20 379h32v2h-32zM20 381h2v2h-2zM50 381h2v2h-2zM20 383h2v2h-2zM50 383h2v2h-2zM20 385h2v2h-2zM50 385h2v2h-2zM20 387h2v2h-2zM50 387h2v2h-2zM20 389h2v2h-2zM50 389h2v2h-2zM20 391h2v2h-2zM50 391h2v2h-2zM20 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M84 385h8v2h-8zM70 387h2v2h-2zM84 387h2v2h-2zM90 387h2v2h-2zM70 389h2v2h-2zM84 389h2v2h-2zM90 389h2v2h-2zM68 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M74 383h2v2h-2zM72 385h4v2h-4zM72 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M64 379h32v2h-32zM64 381h2v2h-2zM94 381h2v2h-2zM64 383h2v2h-2zM94 383h2v2h-2zM64 385h2v2h-2zM94 385h2v2h-2zM64 387h2v2h-2zM94 387h2v2h-2zM64 389h2v2h-2zM94 389h2v2h-2zM64 391h2v2h-2zM94 391h2v2h-2zM64 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M128 385h8v2h-8zM114 387h2v2h-2zM128 387h2v2h-2zM134 387h2v2h-2zM114 389h2v2h-2zM128 389h2v2h-2zM134 389h2v2h-2zM112 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M118 383h2v2h-2zM116 385h4v2h-4zM116 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M108 379h32v2h-32zM108 381h2v2h-2zM138 381h2v2h-2zM108 383h2v2h-2zM138 383h2v2h-2zM108 385h2v2h-2zM138 385h2v2h-2zM108 387h2v2h-2zM138 387h2v2h-2zM108 389h2v2h-2zM138 389h2v2h-2zM108 391h2v2h-2zM138 391h2v2h-2zM108 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M172 385h8v2h-8zM158 387h2v2h-2zM172 387h2v2h-2zM178 387h2v2h-2zM158 389h2v2h-2zM172 389h2v2h-2zM178 389h2v2h-2zM156 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M162 383h2v2h-2zM160 385h4v2h-4zM160 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M152 379h32v2h-32zM152 381h2v2h-2zM182 381h2v2h-2zM152 383h2v2h-2zM182 383h2v2h-2zM152 385h2v2h-2zM182 385h2v2h-2zM152 387h2v2h-2zM182 387h2v2h-2zM152 389h2v2h-2zM182 389h2v2h-2zM152 391h2v2h-2zM182 391h2v2h-2zM152 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M216 385h8v2h-8zM202 387h2v2h-2zM216 387h2v2h-2zM222 387h2v2h-2zM202 389h2v2h-2zM216 389h2v2h-2zM222 389h2v2h-2zM200 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M206 383h2v2h-2zM204 385h4v2h-4zM204 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M196 379h32v2h-32zM196 381h2v2h-2zM226 381h2v2h-2zM196 383h2v2h-2zM226 383h2v2h-2zM196 385h2v2h-2zM226 385h2v2h-2zM196 387h2v2h-2zM226 387h2v2h-2zM196 389h2v2h-2zM226 389h2v2h-2zM196 391h2v2h-2zM226 391h2v2h-2zM196 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M260 385h8v2h-8zM246 387h2v2h-2zM260 387h2v2h-2zM266 387h2v2h-2zM246 389h2v2h-2zM260 389h2v2h-2zM266 389h2v2h-2zM244 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M250 383h2v2h-2zM248 385h4v2h-4zM248 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M240 379h32v2h-32zM240 381h2v2h-2zM270 381h2v2h-2zM240 383h2v2h-2zM270 383h2v2h-2zM240 385h2v2h-2zM270 385h2v2h-2zM240 387h2v2h-2zM270 387h2v2h-2zM240 389h2v2h-2zM270 389h2v2h-2zM240 391h2v2h-2zM270 391h2v2h-2zM240 393h32v2h-32z\"/><path fill=\"#52799f\" d=\"M304 385h8v2h-8zM290 387h2v2h-2zM304 387h2v2h-2zM310 387h2v2h-2zM290 389h2v2h-2zM304 389h2v2h-2zM310 389h2v2h-2zM288 391h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M294 383h2v2h-2zM292 385h4v2h-4zM292 387h2v2h-2z\"/><path fill=\"#51779d\" d=\"M284 379h32v2h-32zM284 381h2v2h-2zM314 381h2v2h-2zM284 383h2v2h-2zM314 383h2v2h-2zM284 385h2v2h-2zM314 385h2v2h-2zM284 387h2v2h-2zM314 387h2v2h-2zM284 389h2v2h-2zM314 389h2v2h-2zM284 391h2v2h-2zM314 391h2v2h-2zM284 393h32v2h-32z\"/><rect x=\"16\" y=\"364\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 366.5h9v3h-9zM24 369.5h3v3h-3zM24 372.5h3v3h-3zM24 375.5h3v3h-3zM24 378.5h3v3h-3zM30 366.5h9v3h-9zM30 369.5h3v3h-3zM36 369.5h3v3h-3zM30 372.5h9v3h-9zM36 375.5h3v3h-3zM30 378.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 355h9v3h-9zM300 361h3v3h-3zM294 364h15v3h-15zM294 367h15v3h-15zM294 370h15v3h-15zM297 373h3v3h-3zM303 373h3v3h-3zM297 376h3v3h-3zM303 376h3v3h-3zM297 379h3v3h-3zM303 379h3v3h-3z\"/><rect x=\"294\" y=\"358\" width=\"15\" height=\"3\" fill=\"#d2ae12\"/><rect x=\"314\" y=\"367\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 369h2v2h-2zM316 371h4v2h-4zM318 373h2v2h-2zM318 375h2v2h-2zM316 377h6v2h-6z\"/><rect x=\"295.5\" y=\"351\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"351\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#e2645a\" d=\"M242 355h3v3h-3zM260 355h3v3h-3zM242 358h3v3h-3zM248 358h9v3h-9zM260 358h3v3h-3zM242 361h3v3h-3zM260 361h3v3h-3zM242 364h3v3h-3zM260 364h3v3h-3zM245 367h15v3h-15zM248 370h9v3h-9zM248 373h9v3h-9zM245 376h3v3h-3zM257 376h3v3h-3zM242 379h6v3h-6zM257 379h6v3h-6z\"/><path fill=\"#68b37f\" d=\"M248 361h9v3h-9zM248 364h9v3h-9z\"/><path fill=\"#e2645a\" d=\"M260 343h3v6h-3zM260 352h3v3h-3z\"/><rect x=\"265\" y=\"367\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#e2645a\" d=\"M269 369h2v2h-2zM267 371h4v2h-4zM269 373h2v2h-2zM269 375h2v2h-2zM267 377h6v2h-6z\"/><rect x=\"246.5\" y=\"351\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"351\" width=\"2.16\" height=\"2\" fill=\"#e2645a\"/><path fill=\"#eaf0fb\" d=\"M205 355h9v3h-9zM205 358h9v3h-9zM208 361h3v3h-3zM193 364h6v3h-6zM205 364h9v3h-9zM193 367h6v3h-6zM205 367h9v3h-9zM196 370h3v3h-3zM205 370h9v3h-9zM193 373h9v3h-9zM205 373h3v3h-3zM211 373h3v3h-3zM193 376h9v3h-9zM205 376h3v3h-3zM211 376h3v3h-3zM193 379h9v3h-9zM205 379h3v3h-3zM211 379h3v3h-3z\"/><path fill=\"#ff39fd\" d=\"M199 367h6v3h-6zM199 370h6v3h-6z\"/><rect x=\"216\" y=\"367\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M220 369h2v2h-2zM218 371h4v2h-4zM220 373h2v2h-2zM220 375h2v2h-2zM218 377h6v2h-6z\"/><rect x=\"197.5\" y=\"351\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"197.5\" y=\"351\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M156 358h9v3h-9zM156 361h9v3h-9zM159 364h3v3h-3zM156 367h9v3h-9zM156 370h9v3h-9zM156 373h9v3h-9zM156 376h3v3h-3zM162 376h3v3h-3zM156 379h3v3h-3zM162 379h3v3h-3z\"/><path fill=\"#7c8a9a\" d=\"M144 355h9v3h-9zM144 358h6v3h-6zM147 361h3v3h-3zM147 364h3v3h-3zM147 367h3v3h-3zM147 370h3v3h-3zM144 373h9v3h-9zM144 376h3v3h-3zM150 376h3v3h-3zM144 379h3v3h-3zM150 379h3v3h-3z\"/><rect x=\"167\" y=\"367\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M171 369h2v2h-2zM169 371h4v2h-4zM171 373h2v2h-2zM171 375h2v2h-2zM169 377h6v2h-6z\"/><rect x=\"148.5\" y=\"351\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"148.5\" y=\"351\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><path fill=\"#eaf0fb\" d=\"M98 358h12v3h-12zM101 361h6v3h-6zM101 364h6v3h-6zM101 367h9v3h-9zM101 370h9v3h-9zM101 373h6v3h-6zM101 376h3v3h-3zM107 376h3v3h-3zM101 379h3v3h-3zM107 379h3v3h-3z\"/><path fill=\"#73cbb7\" d=\"M95 367h6v3h-6zM95 370h6v3h-6zM95 373h6v3h-6z\"/><rect x=\"118\" y=\"367\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M122 369h2v2h-2zM120 371h4v2h-4zM122 373h2v2h-2zM122 375h2v2h-2zM120 377h6v2h-6z\"/><rect x=\"99.5\" y=\"351\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"99.5\" y=\"351\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#8f9ab5\" d=\"M69 371h2v2h-2zM67 373h6v2h-6zM69 375h2v2h-2zM77 369h2v2h-2zM75 371h4v2h-4zM77 373h2v2h-2zM77 375h2v2h-2zM75 377h6v2h-6zM83 369h6v2h-6zM83 371h2v2h-2zM87 371h2v2h-2zM83 373h6v2h-6zM83 375h2v2h-2zM87 375h2v2h-2zM83 377h6v2h-6z\"/><rect x=\"6\" y=\"396\" width=\"436\" height=\"43\" fill=\"#26384a\"/><rect x=\"6\" y=\"396\" width=\"10\" height=\"43\" fill=\"#85c3ff\"/><path fill=\"#52799f\" d=\"M40 429h8v2h-8zM26 431h2v2h-2zM40 431h2v2h-2zM46 431h2v2h-2zM26 433h2v2h-2zM40 433h2v2h-2zM46 433h2v2h-2zM24 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M30 427h2v2h-2zM28 429h4v2h-4zM28 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M20 423h32v2h-32zM20 425h2v2h-2zM50 425h2v2h-2zM20 427h2v2h-2zM50 427h2v2h-2zM20 429h2v2h-2zM50 429h2v2h-2zM20 431h2v2h-2zM50 431h2v2h-2zM20 433h2v2h-2zM50 433h2v2h-2zM20 435h2v2h-2zM50 435h2v2h-2zM20 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M84 429h8v2h-8zM70 431h2v2h-2zM84 431h2v2h-2zM90 431h2v2h-2zM70 433h2v2h-2zM84 433h2v2h-2zM90 433h2v2h-2zM68 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M74 427h2v2h-2zM72 429h4v2h-4zM72 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M64 423h32v2h-32zM64 425h2v2h-2zM94 425h2v2h-2zM64 427h2v2h-2zM94 427h2v2h-2zM64 429h2v2h-2zM94 429h2v2h-2zM64 431h2v2h-2zM94 431h2v2h-2zM64 433h2v2h-2zM94 433h2v2h-2zM64 435h2v2h-2zM94 435h2v2h-2zM64 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M128 429h8v2h-8zM114 431h2v2h-2zM128 431h2v2h-2zM134 431h2v2h-2zM114 433h2v2h-2zM128 433h2v2h-2zM134 433h2v2h-2zM112 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M118 427h2v2h-2zM116 429h4v2h-4zM116 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M108 423h32v2h-32zM108 425h2v2h-2zM138 425h2v2h-2zM108 427h2v2h-2zM138 427h2v2h-2zM108 429h2v2h-2zM138 429h2v2h-2zM108 431h2v2h-2zM138 431h2v2h-2zM108 433h2v2h-2zM138 433h2v2h-2zM108 435h2v2h-2zM138 435h2v2h-2zM108 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M172 429h8v2h-8zM158 431h2v2h-2zM172 431h2v2h-2zM178 431h2v2h-2zM158 433h2v2h-2zM172 433h2v2h-2zM178 433h2v2h-2zM156 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M162 427h2v2h-2zM160 429h4v2h-4zM160 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M152 423h32v2h-32zM152 425h2v2h-2zM182 425h2v2h-2zM152 427h2v2h-2zM182 427h2v2h-2zM152 429h2v2h-2zM182 429h2v2h-2zM152 431h2v2h-2zM182 431h2v2h-2zM152 433h2v2h-2zM182 433h2v2h-2zM152 435h2v2h-2zM182 435h2v2h-2zM152 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M216 429h8v2h-8zM202 431h2v2h-2zM216 431h2v2h-2zM222 431h2v2h-2zM202 433h2v2h-2zM216 433h2v2h-2zM222 433h2v2h-2zM200 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M206 427h2v2h-2zM204 429h4v2h-4zM204 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M196 423h32v2h-32zM196 425h2v2h-2zM226 425h2v2h-2zM196 427h2v2h-2zM226 427h2v2h-2zM196 429h2v2h-2zM226 429h2v2h-2zM196 431h2v2h-2zM226 431h2v2h-2zM196 433h2v2h-2zM226 433h2v2h-2zM196 435h2v2h-2zM226 435h2v2h-2zM196 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M260 429h8v2h-8zM246 431h2v2h-2zM260 431h2v2h-2zM266 431h2v2h-2zM246 433h2v2h-2zM260 433h2v2h-2zM266 433h2v2h-2zM244 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M250 427h2v2h-2zM248 429h4v2h-4zM248 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M240 423h32v2h-32zM240 425h2v2h-2zM270 425h2v2h-2zM240 427h2v2h-2zM270 427h2v2h-2zM240 429h2v2h-2zM270 429h2v2h-2zM240 431h2v2h-2zM270 431h2v2h-2zM240 433h2v2h-2zM270 433h2v2h-2zM240 435h2v2h-2zM270 435h2v2h-2zM240 437h32v2h-32z\"/><path fill=\"#52799f\" d=\"M304 429h8v2h-8zM290 431h2v2h-2zM304 431h2v2h-2zM310 431h2v2h-2zM290 433h2v2h-2zM304 433h2v2h-2zM310 433h2v2h-2zM288 435h6v2h-6z\"/><path fill=\"#77aee6\" d=\"M294 427h2v2h-2zM292 429h4v2h-4zM292 431h2v2h-2z\"/><path fill=\"#51779d\" d=\"M284 423h32v2h-32zM284 425h2v2h-2zM314 425h2v2h-2zM284 427h2v2h-2zM314 427h2v2h-2zM284 429h2v2h-2zM314 429h2v2h-2zM284 431h2v2h-2zM314 431h2v2h-2zM284 433h2v2h-2zM314 433h2v2h-2zM284 435h2v2h-2zM314 435h2v2h-2zM284 437h32v2h-32z\"/><rect x=\"16\" y=\"408\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 410.5h9v3h-9zM24 413.5h3v3h-3zM24 416.5h3v3h-3zM24 419.5h3v3h-3zM24 422.5h3v3h-3zM30 410.5h9v3h-9zM30 413.5h3v3h-3zM36 413.5h3v3h-3zM30 416.5h9v3h-9zM30 419.5h3v3h-3zM36 419.5h3v3h-3zM30 422.5h9v3h-9z\"/><rect x=\"6\" y=\"439\" width=\"436\" height=\"121\" fill=\"#2a3142\"/><rect x=\"9\" y=\"450\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"466\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"482\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"498\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"514\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"530\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"546\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><path fill=\"#8f9ab5\" d=\"M168.5 490h3v3h-3zM165.5 493h6v3h-6zM168.5 496h3v3h-3zM168.5 499h3v3h-3zM165.5 502h9v3h-9zM177.5 490h9v3h-9zM177.5 493h3v3h-3zM183.5 493h3v3h-3zM177.5 496h9v3h-9zM177.5 499h3v3h-3zM183.5 499h3v3h-3zM177.5 502h9v3h-9z\"/><rect x=\"146\" y=\"512\" width=\"60\" height=\"2\" fill=\"#8f9ab5\" opacity=\".45\"/><rect x=\"6\" y=\"560\" width=\"436\" height=\"43\" fill=\"#3a3148\"/><rect x=\"6\" y=\"560\" width=\"10\" height=\"43\" fill=\"#aa91d4\"/><path fill=\"#695983\" d=\"M24 593h6v2h-6zM32 593h8v2h-8zM22 595h10v2h-10zM22 597h10v2h-10zM44 597h6v2h-6zM22 599h2v2h-2zM30 599h2v2h-2zM44 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M20 587h4v2h-4zM48 587h4v2h-4zM20 589h4v2h-4zM48 589h4v2h-4zM46 593h2v2h-2zM46 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M32 589h8v2h-8zM32 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M68 593h6v2h-6zM76 593h8v2h-8zM66 595h10v2h-10zM66 597h10v2h-10zM88 597h6v2h-6zM66 599h2v2h-2zM74 599h2v2h-2zM88 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M64 587h4v2h-4zM92 587h4v2h-4zM64 589h4v2h-4zM92 589h4v2h-4zM90 593h2v2h-2zM90 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M76 589h8v2h-8zM76 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M112 593h6v2h-6zM120 593h8v2h-8zM110 595h10v2h-10zM110 597h10v2h-10zM132 597h6v2h-6zM110 599h2v2h-2zM118 599h2v2h-2zM132 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M108 587h4v2h-4zM136 587h4v2h-4zM108 589h4v2h-4zM136 589h4v2h-4zM134 593h2v2h-2zM134 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M120 589h8v2h-8zM120 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M156 593h6v2h-6zM164 593h8v2h-8zM154 595h10v2h-10zM154 597h10v2h-10zM176 597h6v2h-6zM154 599h2v2h-2zM162 599h2v2h-2zM176 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M152 587h4v2h-4zM180 587h4v2h-4zM152 589h4v2h-4zM180 589h4v2h-4zM178 593h2v2h-2zM178 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M164 589h8v2h-8zM164 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M200 593h6v2h-6zM208 593h8v2h-8zM198 595h10v2h-10zM198 597h10v2h-10zM220 597h6v2h-6zM198 599h2v2h-2zM206 599h2v2h-2zM220 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M196 587h4v2h-4zM224 587h4v2h-4zM196 589h4v2h-4zM224 589h4v2h-4zM222 593h2v2h-2zM222 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M208 589h8v2h-8zM208 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M244 593h6v2h-6zM252 593h8v2h-8zM242 595h10v2h-10zM242 597h10v2h-10zM264 597h6v2h-6zM242 599h2v2h-2zM250 599h2v2h-2zM264 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M240 587h4v2h-4zM268 587h4v2h-4zM240 589h4v2h-4zM268 589h4v2h-4zM266 593h2v2h-2zM266 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M252 589h8v2h-8zM252 591h8v2h-8z\"/><path fill=\"#695983\" d=\"M288 593h6v2h-6zM296 593h8v2h-8zM286 595h10v2h-10zM286 597h10v2h-10zM308 597h6v2h-6zM286 599h2v2h-2zM294 599h2v2h-2zM308 599h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M284 587h4v2h-4zM312 587h4v2h-4zM284 589h4v2h-4zM312 589h4v2h-4zM310 593h2v2h-2zM310 595h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M296 589h8v2h-8zM296 591h8v2h-8z\"/><rect x=\"16\" y=\"572\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 574.5h9v3h-9zM18 577.5h3v3h-3zM18 580.5h9v3h-9zM24 583.5h3v3h-3zM18 586.5h9v3h-9zM30 574.5h9v3h-9zM30 577.5h3v3h-3zM36 577.5h3v3h-3zM30 580.5h9v3h-9zM36 583.5h3v3h-3zM30 586.5h9v3h-9z\"/><rect x=\"6\" y=\"604\" width=\"436\" height=\"43\" fill=\"#312a3d\"/><rect x=\"6\" y=\"604\" width=\"10\" height=\"43\" fill=\"#aa91d4\"/><path fill=\"#695983\" d=\"M24 637h6v2h-6zM32 637h8v2h-8zM22 639h10v2h-10zM22 641h10v2h-10zM44 641h6v2h-6zM22 643h2v2h-2zM30 643h2v2h-2zM44 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M20 631h4v2h-4zM48 631h4v2h-4zM20 633h4v2h-4zM48 633h4v2h-4zM46 637h2v2h-2zM46 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M32 633h8v2h-8zM32 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M68 637h6v2h-6zM76 637h8v2h-8zM66 639h10v2h-10zM66 641h10v2h-10zM88 641h6v2h-6zM66 643h2v2h-2zM74 643h2v2h-2zM88 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M64 631h4v2h-4zM92 631h4v2h-4zM64 633h4v2h-4zM92 633h4v2h-4zM90 637h2v2h-2zM90 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M76 633h8v2h-8zM76 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M112 637h6v2h-6zM120 637h8v2h-8zM110 639h10v2h-10zM110 641h10v2h-10zM132 641h6v2h-6zM110 643h2v2h-2zM118 643h2v2h-2zM132 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M108 631h4v2h-4zM136 631h4v2h-4zM108 633h4v2h-4zM136 633h4v2h-4zM134 637h2v2h-2zM134 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M120 633h8v2h-8zM120 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M156 637h6v2h-6zM164 637h8v2h-8zM154 639h10v2h-10zM154 641h10v2h-10zM176 641h6v2h-6zM154 643h2v2h-2zM162 643h2v2h-2zM176 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M152 631h4v2h-4zM180 631h4v2h-4zM152 633h4v2h-4zM180 633h4v2h-4zM178 637h2v2h-2zM178 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M164 633h8v2h-8zM164 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M200 637h6v2h-6zM208 637h8v2h-8zM198 639h10v2h-10zM198 641h10v2h-10zM220 641h6v2h-6zM198 643h2v2h-2zM206 643h2v2h-2zM220 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M196 631h4v2h-4zM224 631h4v2h-4zM196 633h4v2h-4zM224 633h4v2h-4zM222 637h2v2h-2zM222 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M208 633h8v2h-8zM208 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M244 637h6v2h-6zM252 637h8v2h-8zM242 639h10v2h-10zM242 641h10v2h-10zM264 641h6v2h-6zM242 643h2v2h-2zM250 643h2v2h-2zM264 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M240 631h4v2h-4zM268 631h4v2h-4zM240 633h4v2h-4zM268 633h4v2h-4zM266 637h2v2h-2zM266 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M252 633h8v2h-8zM252 635h8v2h-8z\"/><path fill=\"#695983\" d=\"M288 637h6v2h-6zM296 637h8v2h-8zM286 639h10v2h-10zM286 641h10v2h-10zM308 641h6v2h-6zM286 643h2v2h-2zM294 643h2v2h-2zM308 643h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M284 631h4v2h-4zM312 631h4v2h-4zM284 633h4v2h-4zM312 633h4v2h-4zM310 637h2v2h-2zM310 639h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M296 633h8v2h-8zM296 635h8v2h-8z\"/><rect x=\"16\" y=\"616\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 618.5h9v3h-9zM18 621.5h3v3h-3zM18 624.5h9v3h-9zM24 627.5h3v3h-3zM18 630.5h9v3h-9zM30 618.5h9v3h-9zM30 621.5h3v3h-3zM36 621.5h3v3h-3zM30 624.5h9v3h-9zM30 627.5h3v3h-3zM36 627.5h3v3h-3zM30 630.5h9v3h-9z\"/><rect x=\"6\" y=\"648\" width=\"436\" height=\"43\" fill=\"#3a3148\"/><rect x=\"6\" y=\"648\" width=\"10\" height=\"43\" fill=\"#aa91d4\"/><path fill=\"#695983\" d=\"M24 681h6v2h-6zM32 681h8v2h-8zM22 683h10v2h-10zM22 685h10v2h-10zM44 685h6v2h-6zM22 687h2v2h-2zM30 687h2v2h-2zM44 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M20 675h4v2h-4zM48 675h4v2h-4zM20 677h4v2h-4zM48 677h4v2h-4zM46 681h2v2h-2zM46 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M32 677h8v2h-8zM32 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M68 681h6v2h-6zM76 681h8v2h-8zM66 683h10v2h-10zM66 685h10v2h-10zM88 685h6v2h-6zM66 687h2v2h-2zM74 687h2v2h-2zM88 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M64 675h4v2h-4zM92 675h4v2h-4zM64 677h4v2h-4zM92 677h4v2h-4zM90 681h2v2h-2zM90 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M76 677h8v2h-8zM76 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M112 681h6v2h-6zM120 681h8v2h-8zM110 683h10v2h-10zM110 685h10v2h-10zM132 685h6v2h-6zM110 687h2v2h-2zM118 687h2v2h-2zM132 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M108 675h4v2h-4zM136 675h4v2h-4zM108 677h4v2h-4zM136 677h4v2h-4zM134 681h2v2h-2zM134 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M120 677h8v2h-8zM120 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M156 681h6v2h-6zM164 681h8v2h-8zM154 683h10v2h-10zM154 685h10v2h-10zM176 685h6v2h-6zM154 687h2v2h-2zM162 687h2v2h-2zM176 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M152 675h4v2h-4zM180 675h4v2h-4zM152 677h4v2h-4zM180 677h4v2h-4zM178 681h2v2h-2zM178 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M164 677h8v2h-8zM164 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M200 681h6v2h-6zM208 681h8v2h-8zM198 683h10v2h-10zM198 685h10v2h-10zM220 685h6v2h-6zM198 687h2v2h-2zM206 687h2v2h-2zM220 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M196 675h4v2h-4zM224 675h4v2h-4zM196 677h4v2h-4zM224 677h4v2h-4zM222 681h2v2h-2zM222 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M208 677h8v2h-8zM208 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M244 681h6v2h-6zM252 681h8v2h-8zM242 683h10v2h-10zM242 685h10v2h-10zM264 685h6v2h-6zM242 687h2v2h-2zM250 687h2v2h-2zM264 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M240 675h4v2h-4zM268 675h4v2h-4zM240 677h4v2h-4zM268 677h4v2h-4zM266 681h2v2h-2zM266 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M252 677h8v2h-8zM252 679h8v2h-8z\"/><path fill=\"#695983\" d=\"M288 681h6v2h-6zM296 681h8v2h-8zM286 683h10v2h-10zM286 685h10v2h-10zM308 685h6v2h-6zM286 687h2v2h-2zM294 687h2v2h-2zM308 687h6v2h-6z\"/><path fill=\"#9881bd\" d=\"M284 675h4v2h-4zM312 675h4v2h-4zM284 677h4v2h-4zM312 677h4v2h-4zM310 681h2v2h-2zM310 683h2v2h-2z\"/><path fill=\"#ffb02e\" d=\"M296 677h8v2h-8zM296 679h8v2h-8z\"/><rect x=\"16\" y=\"660\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 662.5h9v3h-9zM18 665.5h3v3h-3zM18 668.5h9v3h-9zM24 671.5h3v3h-3zM18 674.5h9v3h-9zM30 662.5h9v3h-9zM36 665.5h3v3h-3zM36 668.5h3v3h-3zM36 671.5h3v3h-3zM36 674.5h3v3h-3z\"/><path fill=\"#eaf0fb\" d=\"M297 654h9v3h-9zM297 657h9v3h-9zM300 660h3v3h-3zM294 663h15v3h-15zM294 666h12v3h-12zM294 669h12v3h-12zM297 672h3v3h-3zM303 672h3v3h-3zM297 675h3v3h-3zM303 675h3v3h-3z\"/><path fill=\"#3ad39a\" d=\"M306 666h6v3h-6zM306 669h6v3h-6z\"/><rect x=\"314\" y=\"663\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 665h2v2h-2zM316 667h4v2h-4zM318 669h2v2h-2zM318 671h2v2h-2zM316 673h6v2h-6z\"/><rect x=\"295.5\" y=\"647\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"647\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M242 651h6v3h-6zM242 654h6v3h-6zM245 657h3v3h-3zM242 660h9v3h-9zM242 663h9v3h-9zM242 666h9v3h-9zM260 666h3v3h-3zM242 669h3v3h-3zM248 669h3v3h-3zM254 669h9v3h-9zM242 672h3v3h-3zM248 672h3v3h-3zM254 672h9v3h-9zM242 675h3v3h-3zM248 675h3v3h-3zM254 675h3v3h-3zM260 675h3v3h-3z\"/><path fill=\"#7b8448\" d=\"M251 660h3v3h-3zM254 663h3v3h-3zM257 666h3v3h-3z\"/><rect x=\"265\" y=\"663\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 665h2v2h-2zM267 667h4v2h-4zM269 669h2v2h-2zM269 671h2v2h-2zM267 673h6v2h-6z\"/><rect x=\"246.5\" y=\"647\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"647\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"691\" width=\"436\" height=\"121\" fill=\"#2a3142\"/><rect x=\"9\" y=\"702\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"718\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"734\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"750\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"766\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"782\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"798\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><path fill=\"#8f9ab5\" d=\"M165.5 742h9v3h-9zM171.5 745h3v3h-3zM165.5 748h9v3h-9zM165.5 751h3v3h-3zM165.5 754h9v3h-9zM177.5 742h3v3h-3zM183.5 742h3v3h-3zM177.5 745h3v3h-3zM183.5 745h3v3h-3zM177.5 748h9v3h-9zM183.5 751h3v3h-3zM183.5 754h3v3h-3z\"/><rect x=\"146\" y=\"764\" width=\"60\" height=\"2\" fill=\"#8f9ab5\" opacity=\".45\"/><rect x=\"6\" y=\"812\" width=\"436\" height=\"43\" fill=\"#3d3126\"/><rect x=\"6\" y=\"812\" width=\"10\" height=\"43\" fill=\"#d4aa85\"/><path fill=\"#836952\" d=\"M24 843h4v2h-4zM44 843h4v2h-4zM24 845h4v2h-4zM34 845h2v2h-2zM44 845h4v2h-4zM34 847h2v2h-2zM22 849h10v2h-10zM34 849h2v2h-2zM40 849h8v2h-8zM22 851h2v2h-2zM30 851h2v2h-2zM40 851h2v2h-2zM46 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M34 841h2v2h-2zM34 843h2v2h-2zM22 847h10v2h-10zM40 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M68 843h4v2h-4zM88 843h4v2h-4zM68 845h4v2h-4zM78 845h2v2h-2zM88 845h4v2h-4zM78 847h2v2h-2zM66 849h10v2h-10zM78 849h2v2h-2zM84 849h8v2h-8zM66 851h2v2h-2zM74 851h2v2h-2zM84 851h2v2h-2zM90 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M78 841h2v2h-2zM78 843h2v2h-2zM66 847h10v2h-10zM84 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M112 843h4v2h-4zM132 843h4v2h-4zM112 845h4v2h-4zM122 845h2v2h-2zM132 845h4v2h-4zM122 847h2v2h-2zM110 849h10v2h-10zM122 849h2v2h-2zM128 849h8v2h-8zM110 851h2v2h-2zM118 851h2v2h-2zM128 851h2v2h-2zM134 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M122 841h2v2h-2zM122 843h2v2h-2zM110 847h10v2h-10zM128 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M156 843h4v2h-4zM176 843h4v2h-4zM156 845h4v2h-4zM166 845h2v2h-2zM176 845h4v2h-4zM166 847h2v2h-2zM154 849h10v2h-10zM166 849h2v2h-2zM172 849h8v2h-8zM154 851h2v2h-2zM162 851h2v2h-2zM172 851h2v2h-2zM178 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M166 841h2v2h-2zM166 843h2v2h-2zM154 847h10v2h-10zM172 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M200 843h4v2h-4zM220 843h4v2h-4zM200 845h4v2h-4zM210 845h2v2h-2zM220 845h4v2h-4zM210 847h2v2h-2zM198 849h10v2h-10zM210 849h2v2h-2zM216 849h8v2h-8zM198 851h2v2h-2zM206 851h2v2h-2zM216 851h2v2h-2zM222 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M210 841h2v2h-2zM210 843h2v2h-2zM198 847h10v2h-10zM216 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M244 843h4v2h-4zM264 843h4v2h-4zM244 845h4v2h-4zM254 845h2v2h-2zM264 845h4v2h-4zM254 847h2v2h-2zM242 849h10v2h-10zM254 849h2v2h-2zM260 849h8v2h-8zM242 851h2v2h-2zM250 851h2v2h-2zM260 851h2v2h-2zM266 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M254 841h2v2h-2zM254 843h2v2h-2zM242 847h10v2h-10zM260 847h8v2h-8z\"/><path fill=\"#836952\" d=\"M288 843h4v2h-4zM308 843h4v2h-4zM288 845h4v2h-4zM298 845h2v2h-2zM308 845h4v2h-4zM298 847h2v2h-2zM286 849h10v2h-10zM298 849h2v2h-2zM304 849h8v2h-8zM286 851h2v2h-2zM294 851h2v2h-2zM304 851h2v2h-2zM310 851h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M298 841h2v2h-2zM298 843h2v2h-2zM286 847h10v2h-10zM304 847h8v2h-8z\"/><rect x=\"16\" y=\"824\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 826.5h9v3h-9zM24 829.5h3v3h-3zM18 832.5h9v3h-9zM24 835.5h3v3h-3zM18 838.5h9v3h-9zM30 826.5h9v3h-9zM36 829.5h3v3h-3zM30 832.5h9v3h-9zM30 835.5h3v3h-3zM30 838.5h9v3h-9z\"/><rect x=\"6\" y=\"856\" width=\"436\" height=\"43\" fill=\"#483a2d\"/><rect x=\"6\" y=\"856\" width=\"10\" height=\"43\" fill=\"#d4aa85\"/><path fill=\"#836952\" d=\"M24 887h4v2h-4zM44 887h4v2h-4zM24 889h4v2h-4zM34 889h2v2h-2zM44 889h4v2h-4zM34 891h2v2h-2zM22 893h10v2h-10zM34 893h2v2h-2zM40 893h8v2h-8zM22 895h2v2h-2zM30 895h2v2h-2zM40 895h2v2h-2zM46 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M34 885h2v2h-2zM34 887h2v2h-2zM22 891h10v2h-10zM40 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M68 887h4v2h-4zM88 887h4v2h-4zM68 889h4v2h-4zM78 889h2v2h-2zM88 889h4v2h-4zM78 891h2v2h-2zM66 893h10v2h-10zM78 893h2v2h-2zM84 893h8v2h-8zM66 895h2v2h-2zM74 895h2v2h-2zM84 895h2v2h-2zM90 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M78 885h2v2h-2zM78 887h2v2h-2zM66 891h10v2h-10zM84 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M112 887h4v2h-4zM132 887h4v2h-4zM112 889h4v2h-4zM122 889h2v2h-2zM132 889h4v2h-4zM122 891h2v2h-2zM110 893h10v2h-10zM122 893h2v2h-2zM128 893h8v2h-8zM110 895h2v2h-2zM118 895h2v2h-2zM128 895h2v2h-2zM134 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M122 885h2v2h-2zM122 887h2v2h-2zM110 891h10v2h-10zM128 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M156 887h4v2h-4zM176 887h4v2h-4zM156 889h4v2h-4zM166 889h2v2h-2zM176 889h4v2h-4zM166 891h2v2h-2zM154 893h10v2h-10zM166 893h2v2h-2zM172 893h8v2h-8zM154 895h2v2h-2zM162 895h2v2h-2zM172 895h2v2h-2zM178 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M166 885h2v2h-2zM166 887h2v2h-2zM154 891h10v2h-10zM172 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M200 887h4v2h-4zM220 887h4v2h-4zM200 889h4v2h-4zM210 889h2v2h-2zM220 889h4v2h-4zM210 891h2v2h-2zM198 893h10v2h-10zM210 893h2v2h-2zM216 893h8v2h-8zM198 895h2v2h-2zM206 895h2v2h-2zM216 895h2v2h-2zM222 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M210 885h2v2h-2zM210 887h2v2h-2zM198 891h10v2h-10zM216 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M244 887h4v2h-4zM264 887h4v2h-4zM244 889h4v2h-4zM254 889h2v2h-2zM264 889h4v2h-4zM254 891h2v2h-2zM242 893h10v2h-10zM254 893h2v2h-2zM260 893h8v2h-8zM242 895h2v2h-2zM250 895h2v2h-2zM260 895h2v2h-2zM266 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M254 885h2v2h-2zM254 887h2v2h-2zM242 891h10v2h-10zM260 891h8v2h-8z\"/><path fill=\"#836952\" d=\"M288 887h4v2h-4zM308 887h4v2h-4zM288 889h4v2h-4zM298 889h2v2h-2zM308 889h4v2h-4zM298 891h2v2h-2zM286 893h10v2h-10zM298 893h2v2h-2zM304 893h8v2h-8zM286 895h2v2h-2zM294 895h2v2h-2zM304 895h2v2h-2zM310 895h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M298 885h2v2h-2zM298 887h2v2h-2zM286 891h10v2h-10zM304 891h8v2h-8z\"/><rect x=\"16\" y=\"868\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 870.5h9v3h-9zM24 873.5h3v3h-3zM18 876.5h9v3h-9zM24 879.5h3v3h-3zM18 882.5h9v3h-9zM33 870.5h3v3h-3zM30 873.5h6v3h-6zM33 876.5h3v3h-3zM33 879.5h3v3h-3zM30 882.5h9v3h-9z\"/><rect x=\"6\" y=\"900\" width=\"436\" height=\"43\" fill=\"#3d3126\"/><rect x=\"6\" y=\"900\" width=\"10\" height=\"43\" fill=\"#d4aa85\"/><path fill=\"#836952\" d=\"M24 931h4v2h-4zM44 931h4v2h-4zM24 933h4v2h-4zM34 933h2v2h-2zM44 933h4v2h-4zM34 935h2v2h-2zM22 937h10v2h-10zM34 937h2v2h-2zM40 937h8v2h-8zM22 939h2v2h-2zM30 939h2v2h-2zM40 939h2v2h-2zM46 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M34 929h2v2h-2zM34 931h2v2h-2zM22 935h10v2h-10zM40 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M68 931h4v2h-4zM88 931h4v2h-4zM68 933h4v2h-4zM78 933h2v2h-2zM88 933h4v2h-4zM78 935h2v2h-2zM66 937h10v2h-10zM78 937h2v2h-2zM84 937h8v2h-8zM66 939h2v2h-2zM74 939h2v2h-2zM84 939h2v2h-2zM90 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M78 929h2v2h-2zM78 931h2v2h-2zM66 935h10v2h-10zM84 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M112 931h4v2h-4zM132 931h4v2h-4zM112 933h4v2h-4zM122 933h2v2h-2zM132 933h4v2h-4zM122 935h2v2h-2zM110 937h10v2h-10zM122 937h2v2h-2zM128 937h8v2h-8zM110 939h2v2h-2zM118 939h2v2h-2zM128 939h2v2h-2zM134 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M122 929h2v2h-2zM122 931h2v2h-2zM110 935h10v2h-10zM128 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M156 931h4v2h-4zM176 931h4v2h-4zM156 933h4v2h-4zM166 933h2v2h-2zM176 933h4v2h-4zM166 935h2v2h-2zM154 937h10v2h-10zM166 937h2v2h-2zM172 937h8v2h-8zM154 939h2v2h-2zM162 939h2v2h-2zM172 939h2v2h-2zM178 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M166 929h2v2h-2zM166 931h2v2h-2zM154 935h10v2h-10zM172 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M200 931h4v2h-4zM220 931h4v2h-4zM200 933h4v2h-4zM210 933h2v2h-2zM220 933h4v2h-4zM210 935h2v2h-2zM198 937h10v2h-10zM210 937h2v2h-2zM216 937h8v2h-8zM198 939h2v2h-2zM206 939h2v2h-2zM216 939h2v2h-2zM222 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M210 929h2v2h-2zM210 931h2v2h-2zM198 935h10v2h-10zM216 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M244 931h4v2h-4zM264 931h4v2h-4zM244 933h4v2h-4zM254 933h2v2h-2zM264 933h4v2h-4zM254 935h2v2h-2zM242 937h10v2h-10zM254 937h2v2h-2zM260 937h8v2h-8zM242 939h2v2h-2zM250 939h2v2h-2zM260 939h2v2h-2zM266 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M254 929h2v2h-2zM254 931h2v2h-2zM242 935h10v2h-10zM260 935h8v2h-8z\"/><path fill=\"#836952\" d=\"M288 931h4v2h-4zM308 931h4v2h-4zM288 933h4v2h-4zM298 933h2v2h-2zM308 933h4v2h-4zM298 935h2v2h-2zM286 937h10v2h-10zM298 937h2v2h-2zM304 937h8v2h-8zM286 939h2v2h-2zM294 939h2v2h-2zM304 939h2v2h-2zM310 939h2v2h-2z\"/><path fill=\"#bd9877\" d=\"M298 929h2v2h-2zM298 931h2v2h-2zM286 935h10v2h-10zM304 935h8v2h-8z\"/><rect x=\"16\" y=\"912\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 914.5h9v3h-9zM24 917.5h3v3h-3zM18 920.5h9v3h-9zM24 923.5h3v3h-3zM18 926.5h9v3h-9zM30 914.5h9v3h-9zM30 917.5h3v3h-3zM36 917.5h3v3h-3zM30 920.5h3v3h-3zM36 920.5h3v3h-3zM30 923.5h3v3h-3zM36 923.5h3v3h-3zM30 926.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 903h9v3h-9zM297 906h9v3h-9zM300 909h3v3h-3zM294 912h12v3h-12zM294 915h12v3h-12zM294 918h12v3h-12zM297 921h3v3h-3zM303 921h3v3h-3zM297 924h3v3h-3zM303 924h3v3h-3zM297 927h3v3h-3zM303 927h3v3h-3z\"/><path fill=\"#a06bff\" d=\"M309 909h3v3h-3zM309 912h3v3h-3zM306 915h6v3h-6zM306 918h6v3h-6zM306 921h6v3h-6z\"/><rect x=\"314\" y=\"915\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 917h2v2h-2zM316 919h4v2h-4zM318 921h2v2h-2zM318 923h2v2h-2zM316 925h6v2h-6z\"/><rect x=\"295.5\" y=\"899\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"899\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M242 903h3v3h-3zM242 906h3v3h-3zM242 909h3v3h-3zM242 912h3v3h-3zM242 915h3v3h-3zM242 918h3v3h-3zM242 921h3v3h-3zM242 924h3v3h-3zM245 927h3v3h-3zM257 927h3v3h-3z\"/><path fill=\"#947a50\" d=\"M248 903h12v3h-12zM248 906h12v3h-12zM245 909h18v3h-18zM248 912h12v3h-12zM248 915h12v3h-12zM245 918h18v3h-18zM248 921h12v3h-12zM245 924h18v3h-18z\"/><rect x=\"265\" y=\"915\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 917h2v2h-2zM267 919h4v2h-4zM269 921h2v2h-2zM269 923h2v2h-2zM267 925h6v2h-6z\"/><rect x=\"246.5\" y=\"899\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"899\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"943\" width=\"436\" height=\"121\" fill=\"#2a3142\"/><rect x=\"9\" y=\"954\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"970\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"986\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1002\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1018\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1034\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1050\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><path fill=\"#8f9ab5\" d=\"M168.5 994h3v3h-3zM165.5 997h6v3h-6zM168.5 1000h3v3h-3zM168.5 1003h3v3h-3zM165.5 1006h9v3h-9zM177.5 994h3v3h-3zM183.5 994h3v3h-3zM177.5 997h3v3h-3zM183.5 997h3v3h-3zM177.5 1000h9v3h-9zM183.5 1003h3v3h-3zM183.5 1006h3v3h-3z\"/><rect x=\"146\" y=\"1016\" width=\"60\" height=\"2\" fill=\"#8f9ab5\" opacity=\".45\"/><rect x=\"6\" y=\"1064\" width=\"436\" height=\"43\" fill=\"#314640\"/><rect x=\"6\" y=\"1064\" width=\"10\" height=\"43\" fill=\"#91cfbd\"/><path fill=\"#598074\" d=\"M36 1095h2v2h-2zM24 1097h10v2h-10zM36 1097h2v2h-2zM40 1097h10v2h-10zM24 1099h2v2h-2zM30 1099h2v2h-2zM36 1099h2v2h-2zM42 1099h2v2h-2zM48 1099h2v2h-2zM36 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M20 1101h2v2h-2zM20 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M28 1093h4v2h-4zM42 1093h4v2h-4zM28 1095h4v2h-4zM42 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M80 1095h2v2h-2zM68 1097h10v2h-10zM80 1097h2v2h-2zM84 1097h10v2h-10zM68 1099h2v2h-2zM74 1099h2v2h-2zM80 1099h2v2h-2zM86 1099h2v2h-2zM92 1099h2v2h-2zM80 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M64 1101h2v2h-2zM64 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M72 1093h4v2h-4zM86 1093h4v2h-4zM72 1095h4v2h-4zM86 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M124 1095h2v2h-2zM112 1097h10v2h-10zM124 1097h2v2h-2zM128 1097h10v2h-10zM112 1099h2v2h-2zM118 1099h2v2h-2zM124 1099h2v2h-2zM130 1099h2v2h-2zM136 1099h2v2h-2zM124 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M108 1101h2v2h-2zM108 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M116 1093h4v2h-4zM130 1093h4v2h-4zM116 1095h4v2h-4zM130 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M168 1095h2v2h-2zM156 1097h10v2h-10zM168 1097h2v2h-2zM172 1097h10v2h-10zM156 1099h2v2h-2zM162 1099h2v2h-2zM168 1099h2v2h-2zM174 1099h2v2h-2zM180 1099h2v2h-2zM168 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M152 1101h2v2h-2zM152 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M160 1093h4v2h-4zM174 1093h4v2h-4zM160 1095h4v2h-4zM174 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M212 1095h2v2h-2zM200 1097h10v2h-10zM212 1097h2v2h-2zM216 1097h10v2h-10zM200 1099h2v2h-2zM206 1099h2v2h-2zM212 1099h2v2h-2zM218 1099h2v2h-2zM224 1099h2v2h-2zM212 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M196 1101h2v2h-2zM196 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M204 1093h4v2h-4zM218 1093h4v2h-4zM204 1095h4v2h-4zM218 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M256 1095h2v2h-2zM244 1097h10v2h-10zM256 1097h2v2h-2zM260 1097h10v2h-10zM244 1099h2v2h-2zM250 1099h2v2h-2zM256 1099h2v2h-2zM262 1099h2v2h-2zM268 1099h2v2h-2zM256 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M240 1101h2v2h-2zM240 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M248 1093h4v2h-4zM262 1093h4v2h-4zM248 1095h4v2h-4zM262 1095h4v2h-4z\"/><path fill=\"#598074\" d=\"M300 1095h2v2h-2zM288 1097h10v2h-10zM300 1097h2v2h-2zM304 1097h10v2h-10zM288 1099h2v2h-2zM294 1099h2v2h-2zM300 1099h2v2h-2zM306 1099h2v2h-2zM312 1099h2v2h-2zM300 1101h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M284 1101h2v2h-2zM284 1103h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M292 1093h4v2h-4zM306 1093h4v2h-4zM292 1095h4v2h-4zM306 1095h4v2h-4z\"/><rect x=\"16\" y=\"1076\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1078.5h3v3h-3zM18 1081.5h6v3h-6zM21 1084.5h3v3h-3zM21 1087.5h3v3h-3zM18 1090.5h9v3h-9zM30 1078.5h9v3h-9zM30 1081.5h3v3h-3zM30 1084.5h9v3h-9zM36 1087.5h3v3h-3zM30 1090.5h9v3h-9z\"/><rect x=\"6\" y=\"1108\" width=\"436\" height=\"43\" fill=\"#2a3b36\"/><rect x=\"6\" y=\"1108\" width=\"10\" height=\"43\" fill=\"#91cfbd\"/><path fill=\"#598074\" d=\"M36 1139h2v2h-2zM24 1141h10v2h-10zM36 1141h2v2h-2zM40 1141h10v2h-10zM24 1143h2v2h-2zM30 1143h2v2h-2zM36 1143h2v2h-2zM42 1143h2v2h-2zM48 1143h2v2h-2zM36 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M20 1145h2v2h-2zM20 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M28 1137h4v2h-4zM42 1137h4v2h-4zM28 1139h4v2h-4zM42 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M80 1139h2v2h-2zM68 1141h10v2h-10zM80 1141h2v2h-2zM84 1141h10v2h-10zM68 1143h2v2h-2zM74 1143h2v2h-2zM80 1143h2v2h-2zM86 1143h2v2h-2zM92 1143h2v2h-2zM80 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M64 1145h2v2h-2zM64 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M72 1137h4v2h-4zM86 1137h4v2h-4zM72 1139h4v2h-4zM86 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M124 1139h2v2h-2zM112 1141h10v2h-10zM124 1141h2v2h-2zM128 1141h10v2h-10zM112 1143h2v2h-2zM118 1143h2v2h-2zM124 1143h2v2h-2zM130 1143h2v2h-2zM136 1143h2v2h-2zM124 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M108 1145h2v2h-2zM108 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M116 1137h4v2h-4zM130 1137h4v2h-4zM116 1139h4v2h-4zM130 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M168 1139h2v2h-2zM156 1141h10v2h-10zM168 1141h2v2h-2zM172 1141h10v2h-10zM156 1143h2v2h-2zM162 1143h2v2h-2zM168 1143h2v2h-2zM174 1143h2v2h-2zM180 1143h2v2h-2zM168 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M152 1145h2v2h-2zM152 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M160 1137h4v2h-4zM174 1137h4v2h-4zM160 1139h4v2h-4zM174 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M212 1139h2v2h-2zM200 1141h10v2h-10zM212 1141h2v2h-2zM216 1141h10v2h-10zM200 1143h2v2h-2zM206 1143h2v2h-2zM212 1143h2v2h-2zM218 1143h2v2h-2zM224 1143h2v2h-2zM212 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M196 1145h2v2h-2zM196 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M204 1137h4v2h-4zM218 1137h4v2h-4zM204 1139h4v2h-4zM218 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M256 1139h2v2h-2zM244 1141h10v2h-10zM256 1141h2v2h-2zM260 1141h10v2h-10zM244 1143h2v2h-2zM250 1143h2v2h-2zM256 1143h2v2h-2zM262 1143h2v2h-2zM268 1143h2v2h-2zM256 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M240 1145h2v2h-2zM240 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M248 1137h4v2h-4zM262 1137h4v2h-4zM248 1139h4v2h-4zM262 1139h4v2h-4z\"/><path fill=\"#598074\" d=\"M300 1139h2v2h-2zM288 1141h10v2h-10zM300 1141h2v2h-2zM304 1141h10v2h-10zM288 1143h2v2h-2zM294 1143h2v2h-2zM300 1143h2v2h-2zM306 1143h2v2h-2zM312 1143h2v2h-2zM300 1145h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M284 1145h2v2h-2zM284 1147h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M292 1137h4v2h-4zM306 1137h4v2h-4zM292 1139h4v2h-4zM306 1139h4v2h-4z\"/><rect x=\"16\" y=\"1120\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1122.5h3v3h-3zM18 1125.5h6v3h-6zM21 1128.5h3v3h-3zM21 1131.5h3v3h-3zM18 1134.5h9v3h-9zM30 1122.5h3v3h-3zM36 1122.5h3v3h-3zM30 1125.5h3v3h-3zM36 1125.5h3v3h-3zM30 1128.5h9v3h-9zM36 1131.5h3v3h-3zM36 1134.5h3v3h-3z\"/><path fill=\"#eaf0fb\" d=\"M297 1111h9v3h-9zM297 1114h9v3h-9zM300 1117h3v3h-3zM294 1120h12v3h-12zM294 1123h12v3h-12zM294 1126h12v3h-12zM297 1129h3v3h-3zM303 1129h3v3h-3zM297 1132h3v3h-3zM303 1132h3v3h-3zM297 1135h3v3h-3zM303 1135h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M306 1123h6v3h-6zM306 1126h6v3h-6z\"/><rect x=\"314\" y=\"1123\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 1125h2v2h-2zM316 1127h4v2h-4zM318 1129h2v2h-2zM318 1131h2v2h-2zM316 1133h6v2h-6z\"/><rect x=\"295.5\" y=\"1107\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"1107\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M248 1111h9v3h-9zM248 1114h9v3h-9zM251 1117h3v3h-3zM248 1120h12v3h-12zM248 1123h12v3h-12zM248 1126h12v3h-12zM245 1129h15v3h-15zM248 1132h3v3h-3zM254 1132h3v3h-3zM248 1135h3v3h-3zM254 1135h3v3h-3z\"/><path fill=\"#147820\" d=\"M242 1120h6v3h-6zM242 1123h6v3h-6zM242 1126h6v3h-6z\"/><rect x=\"265\" y=\"1123\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 1125h2v2h-2zM267 1127h4v2h-4zM269 1129h2v2h-2zM269 1131h2v2h-2zM267 1133h6v2h-6z\"/><rect x=\"246.5\" y=\"1107\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"1107\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"1152\" width=\"436\" height=\"43\" fill=\"#314640\"/><rect x=\"6\" y=\"1152\" width=\"10\" height=\"43\" fill=\"#91cfbd\"/><path fill=\"#598074\" d=\"M36 1183h2v2h-2zM24 1185h10v2h-10zM36 1185h2v2h-2zM40 1185h10v2h-10zM24 1187h2v2h-2zM30 1187h2v2h-2zM36 1187h2v2h-2zM42 1187h2v2h-2zM48 1187h2v2h-2zM36 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M20 1189h2v2h-2zM20 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M28 1181h4v2h-4zM42 1181h4v2h-4zM28 1183h4v2h-4zM42 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M80 1183h2v2h-2zM68 1185h10v2h-10zM80 1185h2v2h-2zM84 1185h10v2h-10zM68 1187h2v2h-2zM74 1187h2v2h-2zM80 1187h2v2h-2zM86 1187h2v2h-2zM92 1187h2v2h-2zM80 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M64 1189h2v2h-2zM64 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M72 1181h4v2h-4zM86 1181h4v2h-4zM72 1183h4v2h-4zM86 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M124 1183h2v2h-2zM112 1185h10v2h-10zM124 1185h2v2h-2zM128 1185h10v2h-10zM112 1187h2v2h-2zM118 1187h2v2h-2zM124 1187h2v2h-2zM130 1187h2v2h-2zM136 1187h2v2h-2zM124 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M108 1189h2v2h-2zM108 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M116 1181h4v2h-4zM130 1181h4v2h-4zM116 1183h4v2h-4zM130 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M168 1183h2v2h-2zM156 1185h10v2h-10zM168 1185h2v2h-2zM172 1185h10v2h-10zM156 1187h2v2h-2zM162 1187h2v2h-2zM168 1187h2v2h-2zM174 1187h2v2h-2zM180 1187h2v2h-2zM168 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M152 1189h2v2h-2zM152 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M160 1181h4v2h-4zM174 1181h4v2h-4zM160 1183h4v2h-4zM174 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M212 1183h2v2h-2zM200 1185h10v2h-10zM212 1185h2v2h-2zM216 1185h10v2h-10zM200 1187h2v2h-2zM206 1187h2v2h-2zM212 1187h2v2h-2zM218 1187h2v2h-2zM224 1187h2v2h-2zM212 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M196 1189h2v2h-2zM196 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M204 1181h4v2h-4zM218 1181h4v2h-4zM204 1183h4v2h-4zM218 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M256 1183h2v2h-2zM244 1185h10v2h-10zM256 1185h2v2h-2zM260 1185h10v2h-10zM244 1187h2v2h-2zM250 1187h2v2h-2zM256 1187h2v2h-2zM262 1187h2v2h-2zM268 1187h2v2h-2zM256 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M240 1189h2v2h-2zM240 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M248 1181h4v2h-4zM262 1181h4v2h-4zM248 1183h4v2h-4zM262 1183h4v2h-4z\"/><path fill=\"#598074\" d=\"M300 1183h2v2h-2zM288 1185h10v2h-10zM300 1185h2v2h-2zM304 1185h10v2h-10zM288 1187h2v2h-2zM294 1187h2v2h-2zM300 1187h2v2h-2zM306 1187h2v2h-2zM312 1187h2v2h-2zM300 1189h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M284 1189h2v2h-2zM284 1191h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M292 1181h4v2h-4zM306 1181h4v2h-4zM292 1183h4v2h-4zM306 1183h4v2h-4z\"/><rect x=\"16\" y=\"1164\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1166.5h3v3h-3zM18 1169.5h6v3h-6zM21 1172.5h3v3h-3zM21 1175.5h3v3h-3zM18 1178.5h9v3h-9zM30 1166.5h9v3h-9zM36 1169.5h3v3h-3zM30 1172.5h9v3h-9zM36 1175.5h3v3h-3zM30 1178.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 1155h9v3h-9zM297 1158h9v3h-9zM300 1161h3v3h-3zM294 1164h12v3h-12zM294 1167h12v3h-12zM294 1170h12v3h-12zM297 1173h3v3h-3zM303 1173h3v3h-3zM297 1176h3v3h-3zM303 1176h3v3h-3zM297 1179h3v3h-3zM303 1179h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M306 1167h6v3h-6zM306 1170h6v3h-6z\"/><rect x=\"314\" y=\"1167\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 1169h2v2h-2zM316 1171h4v2h-4zM318 1173h2v2h-2zM318 1175h2v2h-2zM316 1177h6v2h-6zM324 1169h6v2h-6zM324 1171h2v2h-2zM324 1173h6v2h-6zM328 1175h2v2h-2zM324 1177h6v2h-6z\"/><rect x=\"295.5\" y=\"1151\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"1151\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#e2645a\" d=\"M242 1155h3v3h-3zM248 1155h9v3h-9zM260 1155h3v3h-3zM242 1158h3v3h-3zM248 1158h9v3h-9zM260 1158h3v3h-3zM242 1161h3v3h-3zM251 1161h3v3h-3zM260 1161h3v3h-3zM245 1164h15v3h-15zM245 1167h6v3h-6zM254 1167h6v3h-6zM245 1170h6v3h-6zM254 1170h6v3h-6zM245 1173h15v3h-15zM245 1176h3v3h-3zM257 1176h3v3h-3zM245 1179h3v3h-3zM257 1179h3v3h-3z\"/><path fill=\"#a2003c\" d=\"M251 1167h3v3h-3zM251 1170h3v3h-3z\"/><path fill=\"#e2645a\" d=\"M260 1143h3v6h-3zM260 1152h3v3h-3z\"/><rect x=\"265\" y=\"1167\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#e2645a\" d=\"M269 1169h2v2h-2zM267 1171h4v2h-4zM269 1173h2v2h-2zM269 1175h2v2h-2zM267 1177h6v2h-6zM275 1169h6v2h-6zM275 1171h2v2h-2zM275 1173h6v2h-6zM279 1175h2v2h-2zM275 1177h6v2h-6z\"/><rect x=\"246.5\" y=\"1151\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"1151\" width=\"2.16\" height=\"2\" fill=\"#e2645a\"/><path fill=\"#eaf0fb\" d=\"M199 1155h9v3h-9zM199 1158h9v3h-9zM199 1164h9v3h-9zM199 1167h9v3h-9zM196 1173h15v3h-15zM199 1176h3v3h-3zM205 1176h3v3h-3zM199 1179h3v3h-3zM205 1179h3v3h-3z\"/><path fill=\"#04a05c\" d=\"M199 1161h9v3h-9zM196 1164h3v3h-3zM208 1164h3v3h-3zM196 1167h3v3h-3zM208 1167h3v3h-3zM196 1170h15v3h-15z\"/><rect x=\"216\" y=\"1167\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M220 1169h2v2h-2zM218 1171h4v2h-4zM220 1173h2v2h-2zM220 1175h2v2h-2zM218 1177h6v2h-6zM226 1169h6v2h-6zM226 1171h2v2h-2zM226 1173h6v2h-6zM230 1175h2v2h-2zM226 1177h6v2h-6z\"/><rect x=\"197.5\" y=\"1151\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"197.5\" y=\"1151\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M150 1155h9v3h-9zM150 1158h9v3h-9zM153 1161h3v3h-3zM147 1164h15v3h-15zM147 1167h15v3h-15zM147 1170h6v3h-6zM156 1170h6v3h-6zM150 1173h3v3h-3zM156 1173h3v3h-3zM150 1176h3v3h-3zM156 1176h3v3h-3zM150 1179h3v3h-3zM156 1179h3v3h-3z\"/><path fill=\"#c8fcc0\" d=\"M153 1170h3v3h-3zM153 1173h3v3h-3zM153 1176h3v3h-3zM153 1179h3v3h-3z\"/><rect x=\"167\" y=\"1167\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M171 1169h2v2h-2zM169 1171h4v2h-4zM171 1173h2v2h-2zM171 1175h2v2h-2zM169 1177h6v2h-6zM177 1169h6v2h-6zM177 1171h2v2h-2zM177 1173h6v2h-6zM181 1175h2v2h-2zM177 1177h6v2h-6z\"/><rect x=\"148.5\" y=\"1151\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"148.5\" y=\"1151\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><path fill=\"#eaf0fb\" d=\"M101 1155h9v3h-9zM101 1158h9v3h-9zM104 1161h3v3h-3zM98 1164h15v3h-15zM98 1167h15v3h-15zM98 1170h15v3h-15zM98 1173h15v3h-15zM101 1176h3v3h-3zM107 1176h3v3h-3zM101 1179h3v3h-3zM107 1179h3v3h-3z\"/><path fill=\"#008c84\" d=\"M95 1161h3v3h-3zM113 1161h3v3h-3zM95 1164h3v3h-3zM113 1164h3v3h-3z\"/><rect x=\"118\" y=\"1167\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M120 1169h2v2h-2zM124 1169h2v2h-2zM120 1171h2v2h-2zM124 1171h2v2h-2zM120 1173h6v2h-6zM124 1175h2v2h-2zM124 1177h2v2h-2z\"/><rect x=\"99.5\" y=\"1151\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"99.5\" y=\"1151\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#8f9ab5\" d=\"M69 1171h2v2h-2zM67 1173h6v2h-6zM69 1175h2v2h-2zM77 1169h2v2h-2zM75 1171h4v2h-4zM77 1173h2v2h-2zM77 1175h2v2h-2zM75 1177h6v2h-6zM83 1169h2v2h-2zM87 1169h2v2h-2zM83 1171h2v2h-2zM87 1171h2v2h-2zM83 1173h6v2h-6zM87 1175h2v2h-2zM87 1177h2v2h-2z\"/><rect x=\"6\" y=\"1196\" width=\"436\" height=\"43\" fill=\"#2a3b36\"/><rect x=\"6\" y=\"1196\" width=\"10\" height=\"43\" fill=\"#91cfbd\"/><path fill=\"#598074\" d=\"M36 1227h2v2h-2zM24 1229h10v2h-10zM36 1229h2v2h-2zM40 1229h10v2h-10zM24 1231h2v2h-2zM30 1231h2v2h-2zM36 1231h2v2h-2zM42 1231h2v2h-2zM48 1231h2v2h-2zM36 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M20 1233h2v2h-2zM20 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M28 1225h4v2h-4zM42 1225h4v2h-4zM28 1227h4v2h-4zM42 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M80 1227h2v2h-2zM68 1229h10v2h-10zM80 1229h2v2h-2zM84 1229h10v2h-10zM68 1231h2v2h-2zM74 1231h2v2h-2zM80 1231h2v2h-2zM86 1231h2v2h-2zM92 1231h2v2h-2zM80 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M64 1233h2v2h-2zM64 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M72 1225h4v2h-4zM86 1225h4v2h-4zM72 1227h4v2h-4zM86 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M124 1227h2v2h-2zM112 1229h10v2h-10zM124 1229h2v2h-2zM128 1229h10v2h-10zM112 1231h2v2h-2zM118 1231h2v2h-2zM124 1231h2v2h-2zM130 1231h2v2h-2zM136 1231h2v2h-2zM124 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M108 1233h2v2h-2zM108 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M116 1225h4v2h-4zM130 1225h4v2h-4zM116 1227h4v2h-4zM130 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M168 1227h2v2h-2zM156 1229h10v2h-10zM168 1229h2v2h-2zM172 1229h10v2h-10zM156 1231h2v2h-2zM162 1231h2v2h-2zM168 1231h2v2h-2zM174 1231h2v2h-2zM180 1231h2v2h-2zM168 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M152 1233h2v2h-2zM152 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M160 1225h4v2h-4zM174 1225h4v2h-4zM160 1227h4v2h-4zM174 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M212 1227h2v2h-2zM200 1229h10v2h-10zM212 1229h2v2h-2zM216 1229h10v2h-10zM200 1231h2v2h-2zM206 1231h2v2h-2zM212 1231h2v2h-2zM218 1231h2v2h-2zM224 1231h2v2h-2zM212 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M196 1233h2v2h-2zM196 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M204 1225h4v2h-4zM218 1225h4v2h-4zM204 1227h4v2h-4zM218 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M256 1227h2v2h-2zM244 1229h10v2h-10zM256 1229h2v2h-2zM260 1229h10v2h-10zM244 1231h2v2h-2zM250 1231h2v2h-2zM256 1231h2v2h-2zM262 1231h2v2h-2zM268 1231h2v2h-2zM256 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M240 1233h2v2h-2zM240 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M248 1225h4v2h-4zM262 1225h4v2h-4zM248 1227h4v2h-4zM262 1227h4v2h-4z\"/><path fill=\"#598074\" d=\"M300 1227h2v2h-2zM288 1229h10v2h-10zM300 1229h2v2h-2zM304 1229h10v2h-10zM288 1231h2v2h-2zM294 1231h2v2h-2zM300 1231h2v2h-2zM306 1231h2v2h-2zM312 1231h2v2h-2zM300 1233h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M284 1233h2v2h-2zM284 1235h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M292 1225h4v2h-4zM306 1225h4v2h-4zM292 1227h4v2h-4zM306 1227h4v2h-4z\"/><rect x=\"16\" y=\"1208\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1210.5h3v3h-3zM18 1213.5h6v3h-6zM21 1216.5h3v3h-3zM21 1219.5h3v3h-3zM18 1222.5h9v3h-9zM30 1210.5h9v3h-9zM36 1213.5h3v3h-3zM30 1216.5h9v3h-9zM30 1219.5h3v3h-3zM30 1222.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M297 1199h9v3h-9zM297 1202h9v3h-9zM300 1205h3v3h-3zM294 1208h15v3h-15zM294 1211h15v3h-15zM294 1214h15v3h-15zM294 1217h15v3h-15zM297 1220h3v3h-3zM303 1220h3v3h-3z\"/><path fill=\"#a894c8\" d=\"M294 1202h3v3h-3zM306 1202h3v3h-3zM294 1223h6v3h-6zM303 1223h6v3h-6z\"/><rect x=\"314\" y=\"1211\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 1213h2v2h-2zM316 1215h4v2h-4zM318 1217h2v2h-2zM318 1219h2v2h-2zM316 1221h6v2h-6z\"/><rect x=\"295.5\" y=\"1195\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"1195\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M248 1199h9v3h-9zM248 1202h9v3h-9zM251 1205h3v3h-3zM245 1208h12v3h-12zM245 1211h12v3h-12zM245 1214h12v3h-12zM248 1217h3v3h-3zM254 1217h3v3h-3zM248 1220h3v3h-3zM254 1220h3v3h-3zM248 1223h3v3h-3zM254 1223h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M257 1211h6v3h-6zM257 1214h6v3h-6z\"/><rect x=\"265\" y=\"1211\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 1213h2v2h-2zM267 1215h4v2h-4zM269 1217h2v2h-2zM269 1219h2v2h-2zM267 1221h6v2h-6z\"/><rect x=\"246.5\" y=\"1195\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"1195\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><rect x=\"6\" y=\"1240\" width=\"436\" height=\"43\" fill=\"#314640\"/><rect x=\"6\" y=\"1240\" width=\"10\" height=\"43\" fill=\"#91cfbd\"/><path fill=\"#598074\" d=\"M36 1271h2v2h-2zM24 1273h10v2h-10zM36 1273h2v2h-2zM40 1273h10v2h-10zM24 1275h2v2h-2zM30 1275h2v2h-2zM36 1275h2v2h-2zM42 1275h2v2h-2zM48 1275h2v2h-2zM36 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M20 1277h2v2h-2zM20 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M28 1269h4v2h-4zM42 1269h4v2h-4zM28 1271h4v2h-4zM42 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M80 1271h2v2h-2zM68 1273h10v2h-10zM80 1273h2v2h-2zM84 1273h10v2h-10zM68 1275h2v2h-2zM74 1275h2v2h-2zM80 1275h2v2h-2zM86 1275h2v2h-2zM92 1275h2v2h-2zM80 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M64 1277h2v2h-2zM64 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M72 1269h4v2h-4zM86 1269h4v2h-4zM72 1271h4v2h-4zM86 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M124 1271h2v2h-2zM112 1273h10v2h-10zM124 1273h2v2h-2zM128 1273h10v2h-10zM112 1275h2v2h-2zM118 1275h2v2h-2zM124 1275h2v2h-2zM130 1275h2v2h-2zM136 1275h2v2h-2zM124 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M108 1277h2v2h-2zM108 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M116 1269h4v2h-4zM130 1269h4v2h-4zM116 1271h4v2h-4zM130 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M168 1271h2v2h-2zM156 1273h10v2h-10zM168 1273h2v2h-2zM172 1273h10v2h-10zM156 1275h2v2h-2zM162 1275h2v2h-2zM168 1275h2v2h-2zM174 1275h2v2h-2zM180 1275h2v2h-2zM168 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M152 1277h2v2h-2zM152 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M160 1269h4v2h-4zM174 1269h4v2h-4zM160 1271h4v2h-4zM174 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M212 1271h2v2h-2zM200 1273h10v2h-10zM212 1273h2v2h-2zM216 1273h10v2h-10zM200 1275h2v2h-2zM206 1275h2v2h-2zM212 1275h2v2h-2zM218 1275h2v2h-2zM224 1275h2v2h-2zM212 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M196 1277h2v2h-2zM196 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M204 1269h4v2h-4zM218 1269h4v2h-4zM204 1271h4v2h-4zM218 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M256 1271h2v2h-2zM244 1273h10v2h-10zM256 1273h2v2h-2zM260 1273h10v2h-10zM244 1275h2v2h-2zM250 1275h2v2h-2zM256 1275h2v2h-2zM262 1275h2v2h-2zM268 1275h2v2h-2zM256 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M240 1277h2v2h-2zM240 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M248 1269h4v2h-4zM262 1269h4v2h-4zM248 1271h4v2h-4zM262 1271h4v2h-4z\"/><path fill=\"#598074\" d=\"M300 1271h2v2h-2zM288 1273h10v2h-10zM300 1273h2v2h-2zM304 1273h10v2h-10zM288 1275h2v2h-2zM294 1275h2v2h-2zM300 1275h2v2h-2zM306 1275h2v2h-2zM312 1275h2v2h-2zM300 1277h2v2h-2z\"/><path fill=\"#81b8a8\" d=\"M284 1277h2v2h-2zM284 1279h2v2h-2z\"/><path fill=\"#7dd8f7\" d=\"M292 1269h4v2h-4zM306 1269h4v2h-4zM292 1271h4v2h-4zM306 1271h4v2h-4z\"/><rect x=\"16\" y=\"1252\" width=\"25\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1254.5h3v3h-3zM18 1257.5h6v3h-6zM21 1260.5h3v3h-3zM21 1263.5h3v3h-3zM18 1266.5h9v3h-9zM33 1254.5h3v3h-3zM30 1257.5h6v3h-6zM33 1260.5h3v3h-3zM33 1263.5h3v3h-3zM30 1266.5h9v3h-9z\"/><rect x=\"6\" y=\"1283\" width=\"436\" height=\"121\" fill=\"#2a3142\"/><rect x=\"9\" y=\"1294\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1310\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1326\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1342\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1358\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1374\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><rect x=\"9\" y=\"1390\" width=\"4\" height=\"8\" fill=\"#8f9ab5\" opacity=\".30\"/><path fill=\"#8f9ab5\" d=\"M171.5 1334h9v3h-9zM171.5 1337h3v3h-3zM171.5 1340h9v3h-9zM171.5 1343h3v3h-3zM177.5 1343h3v3h-3zM171.5 1346h9v3h-9z\"/><rect x=\"146\" y=\"1356\" width=\"60\" height=\"2\" fill=\"#8f9ab5\" opacity=\".45\"/><rect x=\"6\" y=\"1404\" width=\"436\" height=\"43\" fill=\"#263141\"/><rect x=\"6\" y=\"1404\" width=\"10\" height=\"43\" fill=\"#85aae4\"/><path fill=\"#52698d\" d=\"M24 1433h16v2h-16zM40 1437h6v2h-6zM26 1439h8v2h-8zM26 1441h8v2h-8zM40 1441h6v2h-6zM26 1443h8v2h-8zM40 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M24 1431h4v2h-4zM30 1431h4v2h-4zM36 1431h4v2h-4zM40 1435h6v2h-6zM40 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M68 1433h16v2h-16zM84 1437h6v2h-6zM70 1439h8v2h-8zM70 1441h8v2h-8zM84 1441h6v2h-6zM70 1443h8v2h-8zM84 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M68 1431h4v2h-4zM74 1431h4v2h-4zM80 1431h4v2h-4zM84 1435h6v2h-6zM84 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M112 1433h16v2h-16zM128 1437h6v2h-6zM114 1439h8v2h-8zM114 1441h8v2h-8zM128 1441h6v2h-6zM114 1443h8v2h-8zM128 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M112 1431h4v2h-4zM118 1431h4v2h-4zM124 1431h4v2h-4zM128 1435h6v2h-6zM128 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M156 1433h16v2h-16zM172 1437h6v2h-6zM158 1439h8v2h-8zM158 1441h8v2h-8zM172 1441h6v2h-6zM158 1443h8v2h-8zM172 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M156 1431h4v2h-4zM162 1431h4v2h-4zM168 1431h4v2h-4zM172 1435h6v2h-6zM172 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M200 1433h16v2h-16zM216 1437h6v2h-6zM202 1439h8v2h-8zM202 1441h8v2h-8zM216 1441h6v2h-6zM202 1443h8v2h-8zM216 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M200 1431h4v2h-4zM206 1431h4v2h-4zM212 1431h4v2h-4zM216 1435h6v2h-6zM216 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M244 1433h16v2h-16zM260 1437h6v2h-6zM246 1439h8v2h-8zM246 1441h8v2h-8zM260 1441h6v2h-6zM246 1443h8v2h-8zM260 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M244 1431h4v2h-4zM250 1431h4v2h-4zM256 1431h4v2h-4zM260 1435h6v2h-6zM260 1439h6v2h-6z\"/><path fill=\"#52698d\" d=\"M288 1433h16v2h-16zM304 1437h6v2h-6zM290 1439h8v2h-8zM290 1441h8v2h-8zM304 1441h6v2h-6zM290 1443h8v2h-8zM304 1443h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M288 1431h4v2h-4zM294 1431h4v2h-4zM300 1431h4v2h-4zM304 1435h6v2h-6zM304 1439h6v2h-6z\"/><rect x=\"16\" y=\"1416\" width=\"13\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 1418.5h3v3h-3zM24 1418.5h3v3h-3zM18 1421.5h3v3h-3zM24 1421.5h3v3h-3zM18 1424.5h9v3h-9zM24 1427.5h3v3h-3zM24 1430.5h3v3h-3z\"/><rect x=\"6\" y=\"1448\" width=\"436\" height=\"43\" fill=\"#2d3a4d\"/><rect x=\"6\" y=\"1448\" width=\"10\" height=\"43\" fill=\"#85aae4\"/><path fill=\"#52698d\" d=\"M24 1477h16v2h-16zM40 1481h6v2h-6zM26 1483h8v2h-8zM26 1485h8v2h-8zM40 1485h6v2h-6zM26 1487h8v2h-8zM40 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M24 1475h4v2h-4zM30 1475h4v2h-4zM36 1475h4v2h-4zM40 1479h6v2h-6zM40 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M68 1477h16v2h-16zM84 1481h6v2h-6zM70 1483h8v2h-8zM70 1485h8v2h-8zM84 1485h6v2h-6zM70 1487h8v2h-8zM84 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M68 1475h4v2h-4zM74 1475h4v2h-4zM80 1475h4v2h-4zM84 1479h6v2h-6zM84 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M112 1477h16v2h-16zM128 1481h6v2h-6zM114 1483h8v2h-8zM114 1485h8v2h-8zM128 1485h6v2h-6zM114 1487h8v2h-8zM128 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M112 1475h4v2h-4zM118 1475h4v2h-4zM124 1475h4v2h-4zM128 1479h6v2h-6zM128 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M156 1477h16v2h-16zM172 1481h6v2h-6zM158 1483h8v2h-8zM158 1485h8v2h-8zM172 1485h6v2h-6zM158 1487h8v2h-8zM172 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M156 1475h4v2h-4zM162 1475h4v2h-4zM168 1475h4v2h-4zM172 1479h6v2h-6zM172 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M200 1477h16v2h-16zM216 1481h6v2h-6zM202 1483h8v2h-8zM202 1485h8v2h-8zM216 1485h6v2h-6zM202 1487h8v2h-8zM216 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M200 1475h4v2h-4zM206 1475h4v2h-4zM212 1475h4v2h-4zM216 1479h6v2h-6zM216 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M244 1477h16v2h-16zM260 1481h6v2h-6zM246 1483h8v2h-8zM246 1485h8v2h-8zM260 1485h6v2h-6zM246 1487h8v2h-8zM260 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M244 1475h4v2h-4zM250 1475h4v2h-4zM256 1475h4v2h-4zM260 1479h6v2h-6zM260 1483h6v2h-6z\"/><path fill=\"#52698d\" d=\"M288 1477h16v2h-16zM304 1481h6v2h-6zM290 1483h8v2h-8zM290 1485h8v2h-8zM304 1485h6v2h-6zM290 1487h8v2h-8zM304 1487h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M288 1475h4v2h-4zM294 1475h4v2h-4zM300 1475h4v2h-4zM304 1479h6v2h-6zM304 1483h6v2h-6z\"/><rect x=\"16\" y=\"1460\" width=\"13\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 1462.5h9v3h-9zM24 1465.5h3v3h-3zM18 1468.5h9v3h-9zM24 1471.5h3v3h-3zM18 1474.5h9v3h-9z\"/><rect x=\"6\" y=\"1492\" width=\"436\" height=\"43\" fill=\"#263141\"/><rect x=\"6\" y=\"1492\" width=\"10\" height=\"43\" fill=\"#85aae4\"/><path fill=\"#52698d\" d=\"M24 1521h16v2h-16zM40 1525h6v2h-6zM26 1527h8v2h-8zM26 1529h8v2h-8zM40 1529h6v2h-6zM26 1531h8v2h-8zM40 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M24 1519h4v2h-4zM30 1519h4v2h-4zM36 1519h4v2h-4zM40 1523h6v2h-6zM40 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M68 1521h16v2h-16zM84 1525h6v2h-6zM70 1527h8v2h-8zM70 1529h8v2h-8zM84 1529h6v2h-6zM70 1531h8v2h-8zM84 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M68 1519h4v2h-4zM74 1519h4v2h-4zM80 1519h4v2h-4zM84 1523h6v2h-6zM84 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M112 1521h16v2h-16zM128 1525h6v2h-6zM114 1527h8v2h-8zM114 1529h8v2h-8zM128 1529h6v2h-6zM114 1531h8v2h-8zM128 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M112 1519h4v2h-4zM118 1519h4v2h-4zM124 1519h4v2h-4zM128 1523h6v2h-6zM128 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M156 1521h16v2h-16zM172 1525h6v2h-6zM158 1527h8v2h-8zM158 1529h8v2h-8zM172 1529h6v2h-6zM158 1531h8v2h-8zM172 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M156 1519h4v2h-4zM162 1519h4v2h-4zM168 1519h4v2h-4zM172 1523h6v2h-6zM172 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M200 1521h16v2h-16zM216 1525h6v2h-6zM202 1527h8v2h-8zM202 1529h8v2h-8zM216 1529h6v2h-6zM202 1531h8v2h-8zM216 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M200 1519h4v2h-4zM206 1519h4v2h-4zM212 1519h4v2h-4zM216 1523h6v2h-6zM216 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M244 1521h16v2h-16zM260 1525h6v2h-6zM246 1527h8v2h-8zM246 1529h8v2h-8zM260 1529h6v2h-6zM246 1531h8v2h-8zM260 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M244 1519h4v2h-4zM250 1519h4v2h-4zM256 1519h4v2h-4zM260 1523h6v2h-6zM260 1527h6v2h-6z\"/><path fill=\"#52698d\" d=\"M288 1521h16v2h-16zM304 1525h6v2h-6zM290 1527h8v2h-8zM290 1529h8v2h-8zM304 1529h6v2h-6zM290 1531h8v2h-8zM304 1531h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M288 1519h4v2h-4zM294 1519h4v2h-4zM300 1519h4v2h-4zM304 1523h6v2h-6zM304 1527h6v2h-6z\"/><rect x=\"16\" y=\"1504\" width=\"13\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M18 1506.5h9v3h-9zM24 1509.5h3v3h-3zM18 1512.5h9v3h-9zM18 1515.5h3v3h-3zM18 1518.5h9v3h-9z\"/><rect x=\"6\" y=\"1536\" width=\"436\" height=\"43\" fill=\"#2d3a4d\"/><rect x=\"6\" y=\"1536\" width=\"10\" height=\"43\" fill=\"#85aae4\"/><path fill=\"#52698d\" d=\"M24 1565h16v2h-16zM40 1569h6v2h-6zM26 1571h8v2h-8zM26 1573h8v2h-8zM40 1573h6v2h-6zM26 1575h8v2h-8zM40 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M24 1563h4v2h-4zM30 1563h4v2h-4zM36 1563h4v2h-4zM40 1567h6v2h-6zM40 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M68 1565h16v2h-16zM84 1569h6v2h-6zM70 1571h8v2h-8zM70 1573h8v2h-8zM84 1573h6v2h-6zM70 1575h8v2h-8zM84 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M68 1563h4v2h-4zM74 1563h4v2h-4zM80 1563h4v2h-4zM84 1567h6v2h-6zM84 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M112 1565h16v2h-16zM128 1569h6v2h-6zM114 1571h8v2h-8zM114 1573h8v2h-8zM128 1573h6v2h-6zM114 1575h8v2h-8zM128 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M112 1563h4v2h-4zM118 1563h4v2h-4zM124 1563h4v2h-4zM128 1567h6v2h-6zM128 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M156 1565h16v2h-16zM172 1569h6v2h-6zM158 1571h8v2h-8zM158 1573h8v2h-8zM172 1573h6v2h-6zM158 1575h8v2h-8zM172 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M156 1563h4v2h-4zM162 1563h4v2h-4zM168 1563h4v2h-4zM172 1567h6v2h-6zM172 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M200 1565h16v2h-16zM216 1569h6v2h-6zM202 1571h8v2h-8zM202 1573h8v2h-8zM216 1573h6v2h-6zM202 1575h8v2h-8zM216 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M200 1563h4v2h-4zM206 1563h4v2h-4zM212 1563h4v2h-4zM216 1567h6v2h-6zM216 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M244 1565h16v2h-16zM260 1569h6v2h-6zM246 1571h8v2h-8zM246 1573h8v2h-8zM260 1573h6v2h-6zM246 1575h8v2h-8zM260 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M244 1563h4v2h-4zM250 1563h4v2h-4zM256 1563h4v2h-4zM260 1567h6v2h-6zM260 1571h6v2h-6z\"/><path fill=\"#52698d\" d=\"M288 1565h16v2h-16zM304 1569h6v2h-6zM290 1571h8v2h-8zM290 1573h8v2h-8zM304 1573h6v2h-6zM290 1575h8v2h-8zM304 1575h6v2h-6z\"/><path fill=\"#7798cb\" d=\"M288 1563h4v2h-4zM294 1563h4v2h-4zM300 1563h4v2h-4zM304 1567h6v2h-6zM304 1571h6v2h-6z\"/><rect x=\"16\" y=\"1548\" width=\"13\" height=\"19\" fill=\"#0d1018\"/><path fill=\"#c8d0e4\" d=\"M21 1550.5h3v3h-3zM18 1553.5h6v3h-6zM21 1556.5h3v3h-3zM21 1559.5h3v3h-3zM18 1562.5h9v3h-9z\"/><path fill=\"#eaf0fb\" d=\"M294 1539h15v3h-15zM297 1542h9v3h-9zM300 1545h3v3h-3zM294 1548h15v3h-15zM294 1551h3v3h-3zM306 1551h3v3h-3zM294 1554h15v3h-15zM297 1557h3v3h-3zM303 1557h3v3h-3zM297 1560h3v3h-3zM303 1560h3v3h-3zM297 1563h3v3h-3zM303 1563h3v3h-3z\"/><rect x=\"297\" y=\"1551\" width=\"9\" height=\"3\" fill=\"#008c68\"/><rect x=\"314\" y=\"1551\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M318 1553h2v2h-2zM316 1555h4v2h-4zM318 1557h2v2h-2zM318 1559h2v2h-2zM316 1561h6v2h-6zM324 1553h6v2h-6zM328 1555h2v2h-2zM324 1557h6v2h-6zM328 1559h2v2h-2zM324 1561h6v2h-6z\"/><rect x=\"295.5\" y=\"1535\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"295.5\" y=\"1535\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M248 1539h9v3h-9zM248 1542h9v3h-9zM251 1545h3v3h-3zM245 1548h15v3h-15zM248 1557h3v3h-3zM254 1557h3v3h-3zM248 1560h3v3h-3zM254 1560h3v3h-3zM248 1563h3v3h-3zM254 1563h3v3h-3z\"/><path fill=\"#9c8406\" d=\"M242 1551h21v3h-21zM242 1554h21v3h-21z\"/><rect x=\"265\" y=\"1551\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M269 1553h2v2h-2zM267 1555h4v2h-4zM269 1557h2v2h-2zM269 1559h2v2h-2zM267 1561h6v2h-6zM275 1553h6v2h-6zM279 1555h2v2h-2zM275 1557h6v2h-6zM279 1559h2v2h-2zM275 1561h6v2h-6z\"/><rect x=\"246.5\" y=\"1535\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"246.5\" y=\"1535\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><path fill=\"#eaf0fb\" d=\"M199 1539h9v3h-9zM199 1542h9v3h-9zM202 1545h3v3h-3zM196 1548h12v3h-12zM196 1551h12v3h-12zM196 1554h12v3h-12zM199 1557h3v3h-3zM205 1557h3v3h-3zM199 1560h3v3h-3zM205 1560h3v3h-3zM199 1563h3v3h-3zM205 1563h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M208 1551h6v3h-6zM208 1554h6v3h-6z\"/><rect x=\"216\" y=\"1551\" width=\"18\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M220 1553h2v2h-2zM218 1555h4v2h-4zM220 1557h2v2h-2zM220 1559h2v2h-2zM218 1561h6v2h-6zM226 1553h6v2h-6zM230 1555h2v2h-2zM226 1557h6v2h-6zM230 1559h2v2h-2zM226 1561h6v2h-6z\"/><rect x=\"197.5\" y=\"1535\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"197.5\" y=\"1535\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#eaf0fb\" d=\"M150 1539h9v3h-9zM150 1542h9v3h-9zM153 1545h3v3h-3zM147 1548h12v3h-12zM147 1551h12v3h-12zM147 1554h12v3h-12zM150 1557h3v3h-3zM156 1557h3v3h-3zM150 1560h3v3h-3zM156 1560h3v3h-3zM150 1563h3v3h-3zM156 1563h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M159 1551h6v3h-6zM159 1554h6v3h-6z\"/><rect x=\"167\" y=\"1551\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M171 1553h2v2h-2zM169 1555h4v2h-4zM171 1557h2v2h-2zM171 1559h2v2h-2zM169 1561h6v2h-6z\"/><rect x=\"148.5\" y=\"1535\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"148.5\" y=\"1535\" width=\"6.6\" height=\"2\" fill=\"#f0a04a\"/><path fill=\"#eaf0fb\" d=\"M101 1539h9v3h-9zM101 1542h9v3h-9zM104 1545h3v3h-3zM98 1548h12v3h-12zM98 1551h12v3h-12zM98 1554h12v3h-12zM101 1557h3v3h-3zM107 1557h3v3h-3zM101 1560h3v3h-3zM107 1560h3v3h-3zM101 1563h3v3h-3zM107 1563h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M110 1551h6v3h-6zM110 1554h6v3h-6z\"/><rect x=\"118\" y=\"1551\" width=\"10\" height=\"14\" fill=\"#0d1018\"/><path fill=\"#eaf0fb\" d=\"M122 1553h2v2h-2zM120 1555h4v2h-4zM122 1557h2v2h-2zM122 1559h2v2h-2zM120 1561h6v2h-6z\"/><rect x=\"99.5\" y=\"1535\" width=\"12\" height=\"2\" fill=\"#232a38\"/><rect x=\"99.5\" y=\"1535\" width=\"10.2\" height=\"2\" fill=\"#5ddc9a\"/><path fill=\"#8f9ab5\" d=\"M69 1555h2v2h-2zM67 1557h6v2h-6zM69 1559h2v2h-2zM77 1553h2v2h-2zM75 1555h4v2h-4zM77 1557h2v2h-2zM77 1559h2v2h-2zM75 1561h6v2h-6zM83 1553h2v2h-2zM87 1553h2v2h-2zM83 1555h2v2h-2zM87 1555h2v2h-2zM83 1557h6v2h-6zM87 1559h2v2h-2zM87 1561h2v2h-2z\"/><rect x=\"346\" y=\"56\" width=\"48\" height=\"1524\" fill=\"#141924\"/><rect x=\"393\" y=\"56\" width=\"1\" height=\"1524\" fill=\"#2c313d\"/><rect x=\"394\" y=\"56\" width=\"48\" height=\"1524\" fill=\"#141924\"/><rect x=\"441\" y=\"56\" width=\"1\" height=\"1524\" fill=\"#2c313d\"/><path fill=\"#e6e0d0\" d=\"M0 56h6v1524h-6zM442 56h6v1524h-6z\"/><path fill=\"#9aa8c0\" d=\"M2 59h2v4h-2zM444 59h2v4h-2zM2 68h2v4h-2zM444 68h2v4h-2zM2 77h2v4h-2zM444 77h2v4h-2zM2 86h2v4h-2zM444 86h2v4h-2zM2 95h2v4h-2zM444 95h2v4h-2zM2 104h2v4h-2zM444 104h2v4h-2zM2 113h2v4h-2zM444 113h2v4h-2zM2 122h2v4h-2zM444 122h2v4h-2zM2 131h2v4h-2zM444 131h2v4h-2zM2 140h2v4h-2zM444 140h2v4h-2zM2 149h2v4h-2zM444 149h2v4h-2zM2 158h2v4h-2zM444 158h2v4h-2zM2 167h2v4h-2zM444 167h2v4h-2zM2 176h2v4h-2zM444 176h2v4h-2zM2 185h2v4h-2zM444 185h2v4h-2zM2 194h2v4h-2zM444 194h2v4h-2zM2 203h2v4h-2zM444 203h2v4h-2zM2 212h2v4h-2zM444 212h2v4h-2zM2 221h2v4h-2zM444 221h2v4h-2zM2 230h2v4h-2zM444 230h2v4h-2zM2 239h2v4h-2zM444 239h2v4h-2zM2 248h2v4h-2zM444 248h2v4h-2zM2 257h2v4h-2zM444 257h2v4h-2zM2 266h2v4h-2zM444 266h2v4h-2zM2 275h2v4h-2zM444 275h2v4h-2zM2 284h2v4h-2zM444 284h2v4h-2zM2 293h2v4h-2zM444 293h2v4h-2zM2 302h2v4h-2zM444 302h2v4h-2zM2 311h2v4h-2zM444 311h2v4h-2zM2 320h2v4h-2zM444 320h2v4h-2zM2 329h2v4h-2zM444 329h2v4h-2zM2 338h2v4h-2zM444 338h2v4h-2zM2 347h2v4h-2zM444 347h2v4h-2zM2 356h2v4h-2zM444 356h2v4h-2zM2 365h2v4h-2zM444 365h2v4h-2zM2 374h2v4h-2zM444 374h2v4h-2zM2 383h2v4h-2zM444 383h2v4h-2zM2 392h2v4h-2zM444 392h2v4h-2zM2 401h2v4h-2zM444 401h2v4h-2zM2 410h2v4h-2zM444 410h2v4h-2zM2 419h2v4h-2zM444 419h2v4h-2zM2 428h2v4h-2zM444 428h2v4h-2zM2 437h2v4h-2zM444 437h2v4h-2zM2 446h2v4h-2zM444 446h2v4h-2zM2 455h2v4h-2zM444 455h2v4h-2zM2 464h2v4h-2zM444 464h2v4h-2zM2 473h2v4h-2zM444 473h2v4h-2zM2 482h2v4h-2zM444 482h2v4h-2zM2 491h2v4h-2zM444 491h2v4h-2zM2 500h2v4h-2zM444 500h2v4h-2zM2 509h2v4h-2zM444 509h2v4h-2zM2 518h2v4h-2zM444 518h2v4h-2zM2 527h2v4h-2zM444 527h2v4h-2zM2 536h2v4h-2zM444 536h2v4h-2zM2 545h2v4h-2zM444 545h2v4h-2zM2 554h2v4h-2zM444 554h2v4h-2zM2 563h2v4h-2zM444 563h2v4h-2zM2 572h2v4h-2zM444 572h2v4h-2zM2 581h2v4h-2zM444 581h2v4h-2zM2 590h2v4h-2zM444 590h2v4h-2zM2 599h2v4h-2zM444 599h2v4h-2zM2 608h2v4h-2zM444 608h2v4h-2zM2 617h2v4h-2zM444 617h2v4h-2zM2 626h2v4h-2zM444 626h2v4h-2zM2 635h2v4h-2zM444 635h2v4h-2zM2 644h2v4h-2zM444 644h2v4h-2zM2 653h2v4h-2zM444 653h2v4h-2zM2 662h2v4h-2zM444 662h2v4h-2zM2 671h2v4h-2zM444 671h2v4h-2zM2 680h2v4h-2zM444 680h2v4h-2zM2 689h2v4h-2zM444 689h2v4h-2zM2 698h2v4h-2zM444 698h2v4h-2zM2 707h2v4h-2zM444 707h2v4h-2zM2 716h2v4h-2zM444 716h2v4h-2zM2 725h2v4h-2zM444 725h2v4h-2zM2 734h2v4h-2zM444 734h2v4h-2zM2 743h2v4h-2zM444 743h2v4h-2zM2 752h2v4h-2zM444 752h2v4h-2zM2 761h2v4h-2zM444 761h2v4h-2zM2 770h2v4h-2zM444 770h2v4h-2zM2 779h2v4h-2zM444 779h2v4h-2zM2 788h2v4h-2zM444 788h2v4h-2zM2 797h2v4h-2zM444 797h2v4h-2zM2 806h2v4h-2zM444 806h2v4h-2zM2 815h2v4h-2zM444 815h2v4h-2zM2 824h2v4h-2zM444 824h2v4h-2zM2 833h2v4h-2zM444 833h2v4h-2zM2 842h2v4h-2zM444 842h2v4h-2zM2 851h2v4h-2zM444 851h2v4h-2zM2 860h2v4h-2zM444 860h2v4h-2zM2 869h2v4h-2zM444 869h2v4h-2zM2 878h2v4h-2zM444 878h2v4h-2zM2 887h2v4h-2zM444 887h2v4h-2zM2 896h2v4h-2zM444 896h2v4h-2zM2 905h2v4h-2zM444 905h2v4h-2zM2 914h2v4h-2zM444 914h2v4h-2zM2 923h2v4h-2zM444 923h2v4h-2zM2 932h2v4h-2zM444 932h2v4h-2zM2 941h2v4h-2zM444 941h2v4h-2zM2 950h2v4h-2zM444 950h2v4h-2zM2 959h2v4h-2zM444 959h2v4h-2zM2 968h2v4h-2zM444 968h2v4h-2zM2 977h2v4h-2zM444 977h2v4h-2zM2 986h2v4h-2zM444 986h2v4h-2zM2 995h2v4h-2zM444 995h2v4h-2zM2 1004h2v4h-2zM444 1004h2v4h-2zM2 1013h2v4h-2zM444 1013h2v4h-2zM2 1022h2v4h-2zM444 1022h2v4h-2zM2 1031h2v4h-2zM444 1031h2v4h-2zM2 1040h2v4h-2zM444 1040h2v4h-2zM2 1049h2v4h-2zM444 1049h2v4h-2zM2 1058h2v4h-2zM444 1058h2v4h-2zM2 1067h2v4h-2zM444 1067h2v4h-2zM2 1076h2v4h-2zM444 1076h2v4h-2zM2 1085h2v4h-2zM444 1085h2v4h-2zM2 1094h2v4h-2zM444 1094h2v4h-2zM2 1103h2v4h-2zM444 1103h2v4h-2zM2 1112h2v4h-2zM444 1112h2v4h-2zM2 1121h2v4h-2zM444 1121h2v4h-2zM2 1130h2v4h-2zM444 1130h2v4h-2zM2 1139h2v4h-2zM444 1139h2v4h-2zM2 1148h2v4h-2zM444 1148h2v4h-2zM2 1157h2v4h-2zM444 1157h2v4h-2zM2 1166h2v4h-2zM444 1166h2v4h-2zM2 1175h2v4h-2zM444 1175h2v4h-2zM2 1184h2v4h-2zM444 1184h2v4h-2zM2 1193h2v4h-2zM444 1193h2v4h-2zM2 1202h2v4h-2zM444 1202h2v4h-2zM2 1211h2v4h-2zM444 1211h2v4h-2zM2 1220h2v4h-2zM444 1220h2v4h-2zM2 1229h2v4h-2zM444 1229h2v4h-2zM2 1238h2v4h-2zM444 1238h2v4h-2zM2 1247h2v4h-2zM444 1247h2v4h-2zM2 1256h2v4h-2zM444 1256h2v4h-2zM2 1265h2v4h-2zM444 1265h2v4h-2zM2 1274h2v4h-2zM444 1274h2v4h-2zM2 1283h2v4h-2zM444 1283h2v4h-2zM2 1292h2v4h-2zM444 1292h2v4h-2zM2 1301h2v4h-2zM444 1301h2v4h-2zM2 1310h2v4h-2zM444 1310h2v4h-2zM2 1319h2v4h-2zM444 1319h2v4h-2zM2 1328h2v4h-2zM444 1328h2v4h-2zM2 1337h2v4h-2zM444 1337h2v4h-2zM2 1346h2v4h-2zM444 1346h2v4h-2zM2 1355h2v4h-2zM444 1355h2v4h-2zM2 1364h2v4h-2zM444 1364h2v4h-2zM2 1373h2v4h-2zM444 1373h2v4h-2zM2 1382h2v4h-2zM444 1382h2v4h-2zM2 1391h2v4h-2zM444 1391h2v4h-2zM2 1400h2v4h-2zM444 1400h2v4h-2zM2 1409h2v4h-2zM444 1409h2v4h-2zM2 1418h2v4h-2zM444 1418h2v4h-2zM2 1427h2v4h-2zM444 1427h2v4h-2zM2 1436h2v4h-2zM444 1436h2v4h-2zM2 1445h2v4h-2zM444 1445h2v4h-2zM2 1454h2v4h-2zM444 1454h2v4h-2zM2 1463h2v4h-2zM444 1463h2v4h-2zM2 1472h2v4h-2zM444 1472h2v4h-2zM2 1481h2v4h-2zM444 1481h2v4h-2zM2 1490h2v4h-2zM444 1490h2v4h-2zM2 1499h2v4h-2zM444 1499h2v4h-2zM2 1508h2v4h-2zM444 1508h2v4h-2zM2 1517h2v4h-2zM444 1517h2v4h-2zM2 1526h2v4h-2zM444 1526h2v4h-2zM2 1535h2v4h-2zM444 1535h2v4h-2zM2 1544h2v4h-2zM444 1544h2v4h-2zM2 1553h2v4h-2zM444 1553h2v4h-2zM2 1562h2v4h-2zM444 1562h2v4h-2zM2 1571h2v4h-2zM444 1571h2v4h-2z\"/><rect x=\"156.8\" y=\"16.8\" width=\"134.4\" height=\"6.16\" fill=\"#f2c452\"/><rect x=\"130.667\" y=\"22.5867\" width=\"186.667\" height=\"6.16\" fill=\"#c9932f\"/><rect x=\"104.533\" y=\"28.3733\" width=\"238.933\" height=\"6.16\" fill=\"#f2c452\"/><rect x=\"78.4\" y=\"34.16\" width=\"291.2\" height=\"6.16\" fill=\"#c9932f\"/><rect x=\"52.2667\" y=\"39.9467\" width=\"343.467\" height=\"6.16\" fill=\"#f2c452\"/><rect x=\"26.1333\" y=\"45.7333\" width=\"395.733\" height=\"6.16\" fill=\"#c9932f\"/><rect x=\"0\" y=\"51.52\" width=\"448\" height=\"6.16\" fill=\"#f2c452\"/><rect x=\"147.84\" y=\"8.96\" width=\"152.32\" height=\"7.84\" fill=\"#9c7020\"/><rect x=\"134.4\" y=\"5.6\" width=\"179.2\" height=\"3\" fill=\"#ffe07a\"/><rect x=\"220\" y=\"1.12\" width=\"8\" height=\"6.72\" fill=\"#cf6250\"/><rect x=\"0\" y=\"52\" width=\"448\" height=\"4\" fill=\"#9c7020\"/><g class=\"rideUp\"><rect x=\"347\" y=\"1537\" width=\"46\" height=\"42\" fill=\"#e6ecf7\"/><path fill=\"#12161f\" d=\"M354.5 1539h9v3h-9zM354.5 1542h9v3h-9zM357.5 1545h3v3h-3zM351.5 1548h12v3h-12zM351.5 1551h12v3h-12zM351.5 1554h12v3h-12zM354.5 1557h3v3h-3zM360.5 1557h3v3h-3zM354.5 1560h3v3h-3zM360.5 1560h3v3h-3zM354.5 1563h3v3h-3zM360.5 1563h3v3h-3z\"/><path fill=\"#8a5a2b\" d=\"M363.5 1551h6v3h-6zM363.5 1554h6v3h-6z\"/><path fill=\"#12161f\" d=\"M373.5 1539h15v3h-15zM376.5 1542h9v3h-9zM379.5 1545h3v3h-3zM373.5 1548h15v3h-15zM373.5 1551h3v3h-3zM385.5 1551h3v3h-3zM373.5 1554h15v3h-15zM376.5 1557h3v3h-3zM382.5 1557h3v3h-3zM376.5 1560h3v3h-3zM382.5 1560h3v3h-3zM376.5 1563h3v3h-3zM382.5 1563h3v3h-3z\"/><rect x=\"376.5\" y=\"1551\" width=\"9\" height=\"3\" fill=\"#008c68\"/><rect x=\"347.5\" y=\"1537.5\" width=\"45\" height=\"41\" fill=\"none\" stroke=\"#2a3142\" stroke-width=\"1\"/></g><g class=\"rideDown\"><rect x=\"395\" y=\"1537\" width=\"46\" height=\"42\" fill=\"#e6ecf7\"/><rect x=\"395\" y=\"1537\" width=\"23\" height=\"42\" fill=\"#8f9db5\"/><rect x=\"397\" y=\"1544.56\" width=\"21\" height=\"26.04\" fill=\"#cfdcf0\"/><rect x=\"418\" y=\"1537\" width=\"23\" height=\"42\" fill=\"#8f9db5\"/><rect x=\"419\" y=\"1544.56\" width=\"21\" height=\"26.04\" fill=\"#cfdcf0\"/><path fill=\"#12161f\" d=\"M402.5 1539h9v3h-9zM402.5 1542h9v3h-9zM405.5 1545h3v3h-3zM399.5 1548h12v3h-12zM399.5 1551h12v3h-12zM399.5 1554h12v3h-12zM402.5 1557h3v3h-3zM408.5 1557h3v3h-3zM402.5 1560h3v3h-3zM408.5 1560h3v3h-3zM402.5 1563h3v3h-3zM408.5 1563h3v3h-3z\"/><path fill=\"#a06bff\" d=\"M414.5 1545h3v3h-3zM414.5 1548h3v3h-3zM411.5 1551h6v3h-6zM411.5 1554h6v3h-6zM411.5 1557h6v3h-6z\"/><path fill=\"#12161f\" d=\"M424.5 1539h9v3h-9zM427.5 1545h3v3h-3zM421.5 1548h15v3h-15zM421.5 1551h15v3h-15zM421.5 1554h15v3h-15zM424.5 1557h3v3h-3zM430.5 1557h3v3h-3zM424.5 1560h3v3h-3zM430.5 1560h3v3h-3zM424.5 1563h3v3h-3zM430.5 1563h3v3h-3z\"/><rect x=\"421.5\" y=\"1542\" width=\"15\" height=\"3\" fill=\"#d2ae12\"/><rect x=\"395.5\" y=\"1537.5\" width=\"45\" height=\"41\" fill=\"none\" stroke=\"#2a3142\" stroke-width=\"1\"/></g><g class=\"rideUp\"><g class=\"rideDoorL\"><rect x=\"347\" y=\"1537\" width=\"23\" height=\"42\" fill=\"#8f9db5\"/><rect x=\"349\" y=\"1544.56\" width=\"21\" height=\"26.04\" fill=\"#cfdcf0\"/></g><g class=\"rideDoorR\"><rect x=\"370\" y=\"1537\" width=\"23\" height=\"42\" fill=\"#8f9db5\"/><rect x=\"371\" y=\"1544.56\" width=\"21\" height=\"26.04\" fill=\"#cfdcf0\"/></g></g></g></svg>";

// 產生當下讀到的每一筆資料。**驗收第 25 組拿活的模組再算一份來比。**
export const LAND_SRC = {
 "bands": [
  {
   "color": "#3a4a63",
   "from": 1,
   "key": "retail",
   "name": "零售",
   "to": 10
  },
  {
   "color": "#3f5a52",
   "from": 11,
   "key": "office",
   "name": "辦公",
   "to": 20
  },
  {
   "color": "#5c4a3a",
   "from": 21,
   "key": "hotel",
   "name": "飯店",
   "to": 45
  },
  {
   "color": "#4a3f5c",
   "from": 46,
   "key": "resid",
   "name": "住宅",
   "to": 70
  },
  {
   "color": "#3a5570",
   "from": 71,
   "key": "obs",
   "name": "觀景台",
   "to": 85
  },
  {
   "color": "#5c3a4a",
   "from": 86,
   "key": "exp",
   "name": "實驗樓層",
   "to": 99
  },
  {
   "color": "#2f4f6b",
   "from": 100,
   "key": "roof",
   "name": "屋頂→軌道",
   "to": 9999
  }
 ],
 "events": [
  {
   "at": "lobby",
   "hours": [
    10,
    12
   ],
   "id": "anniversary",
   "n": [
    14,
    24
   ],
   "name": "週年慶開門",
   "to": "retail"
  },
  {
   "at": "office",
   "hours": [
    9,
    11
   ],
   "id": "townhall",
   "n": [
    14,
    24
   ],
   "name": "全員大會",
   "to": "office"
  },
  {
   "at": "obs",
   "hours": [
    22,
    24
   ],
   "id": "deckclose",
   "n": [
    18,
    28
   ],
   "name": "觀景台清場",
   "to": "lobby"
  },
  {
   "at": "exp",
   "hours": [
    22,
    24
   ],
   "id": "handover",
   "n": [
    4,
    7
   ],
   "name": "夜班交接",
   "to": "exp"
  }
 ],
 "motifs": [
  {
   "glow": "#7dd8f7",
   "key": "exp",
   "rows": [
    "................",
    "....g......gg...",
    "...ggg.....gg...",
    "..#####..#.gg.#.",
    "..#####..#.gg.#.",
    "ooooooooooooooo.",
    "..#.........#...",
    "................"
   ]
  },
  {
   "glow": null,
   "key": "hotel",
   "rows": [
    "................",
    ".......o........",
    "..##...o....##..",
    "..##...#....##..",
    ".ooooo.#..oooo..",
    ".#####.#..####..",
    ".#...#....#..#..",
    "................"
   ]
  },
  {
   "glow": null,
   "key": "obs",
   "rows": [
    "wwwwwwwwwwwwwwww",
    "w..............w",
    "w....o.........w",
    "w...oo....####.w",
    "w..#o.....#..#.w",
    "w..#......#..#.w",
    "w.###..........w",
    "wwwwwwwwwwwwwwww"
   ]
  },
  {
   "glow": "#7dd8f7",
   "key": "office",
   "rows": [
    "................",
    "....gg.....gg...",
    "....gg..#..gg...",
    "..#####.#.#####.",
    "..#..#..#..#..#.",
    "o.......#.......",
    "o...............",
    "................"
   ]
  },
  {
   "glow": "#ffb02e",
   "key": "resid",
   "rows": [
    "oo............oo",
    "oo....gggg....oo",
    "......gggg......",
    "..###.####...o..",
    ".#####.......o..",
    ".#####......###.",
    ".#...#......###.",
    "................"
   ]
  },
  {
   "glow": null,
   "key": "retail",
   "rows": [
    "..oo.oo.oo......",
    "..########......",
    "..........ooo...",
    "..........###...",
    "...####...ooo...",
    "...####...###...",
    "...####...###...",
    "................"
   ]
  }
 ],
 "palette": {
  "bad": "#e2645a",
  "car": "#e6ecf7",
  "carDoors": "#f0c04a",
  "carEdge": "#2a3142",
  "carGlass": "#cfdcf0",
  "crowdBar": "#8f9ab5",
  "deck": "#cfd6e2",
  "door": "#8f9db5",
  "expressTint": "#f0c04a",
  "expressTintA": "0.08",
  "far": "#b9c7db",
  "floorA": "0.78",
  "floorAlpha": "1",
  "floorB": "0.66",
  "floorNum": "#c8d0e4",
  "floorNumOn": "#7cc4ff",
  "furn": "1.42",
  "furnAcc": "2.05",
  "glassK": "1.40",
  "ground": "#b7ae9c",
  "groundLine": "#8d8676",
  "heatCool": "#6d7690",
  "heatWarm": "#f0a04a",
  "ink": "#eaf0fb",
  "inkCar": "#12161f",
  "label": "#9aa4bd",
  "lamp": "#f0c04a",
  "lampA": "0.15",
  "money": "#5ddc9a",
  "night": "0",
  "numPlate": "#0d1018",
  "patienceBg": "#232a38",
  "personText": "#eaf0fb",
  "riderBar": "#7f95bd",
  "shaft": "#141924",
  "shaftEdge": "#2c313d",
  "shaftExpress": "#c08a3a",
  "slab": "#2a3142",
  "stripe": "2.30",
  "tile": "#f2c452",
  "tileBrk": "#cf6250",
  "tileDark": "#c9932f",
  "tileOrn": "#ffe07a",
  "tileRidge": "#9c7020",
  "wall": "#e6e0d0",
  "wallWin": "#9aa8c0",
  "warn": "#f0a04a",
  "winLit": "#ffcf6a"
 },
 "people": [
  {
   "acc": "#68b37f",
   "id": "acrophobe",
   "normal": [
    ".......",
    "..###..",
    "..ooo..",
    "..ooo..",
    "#######",
    "#.###.#",
    "#.###.#",
    ".#####.",
    ".#...#."
   ],
   "urgent": [
    "#.....#",
    "#.###.#",
    "#.ooo.#",
    "#.ooo.#",
    ".#####.",
    "..###..",
    "..###..",
    ".#...#.",
    "##...##"
   ]
  },
  {
   "acc": "#147820",
   "id": "attendee",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    "oo####.",
    "oo####.",
    "oo####.",
    ".#####.",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "..###.#",
    "..###.#",
    "...#..#",
    "oo####.",
    "oo####.",
    "oo####.",
    ".#####.",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#a2003c",
   "id": "ceo",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    ".##o##.",
    ".##o##.",
    ".#####.",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.#",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".##o##.",
    ".##o##.",
    ".#####.",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#008c84",
   "id": "coffeegoer",
   "normal": [
    "..###..",
    "..###..",
    "o..#..o",
    "o#####o",
    ".#####.",
    ".#####.",
    ".#####.",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "..###..",
    "..###..",
    "o..#..o",
    "o#####o",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#9c8406",
   "id": "courier",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    "ooooooo",
    "ooooooo",
    "..#.#..",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.#",
    "#.###.#",
    "#..#..#",
    ".#####.",
    "ooooooo",
    "ooooooo",
    "..#.#..",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#128ec0",
   "id": "deckguide",
   "normal": [
    "....ooo",
    "###.oo.",
    "###.o..",
    ".#..o..",
    "####o..",
    "###.o..",
    "###.o..",
    "#.#.o..",
    "#.#.o.."
   ],
   "urgent": [
    "...oooo",
    "###.ooo",
    "###.oo.",
    ".###o..",
    "####o..",
    "###.o..",
    "###.o..",
    "#.#.o..",
    "##..o.."
   ]
  },
  {
   "acc": "#7b8448",
   "id": "dogwalker",
   "normal": [
    "##.....",
    "##.....",
    ".#.....",
    "###o...",
    "###.o..",
    "###..o#",
    "#.#.###",
    "#.#.###",
    "#.#.#.#"
   ],
   "urgent": [
    "#.#....",
    "#.#....",
    "#.#....",
    "###o...",
    "###.o..",
    "###..o#",
    "#.#.###",
    "..#.###",
    ".##.#.#"
   ]
  },
  {
   "acc": "#a06bff",
   "id": "guest",
   "normal": [
    "..###..",
    "..###..",
    "...#..o",
    ".####.o",
    ".####oo",
    ".####oo",
    "..#.#oo",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.o",
    "#.###.o",
    "#..#..o",
    ".####.o",
    ".####oo",
    ".####oo",
    "..#.#oo",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#7bbc04",
   "id": "hazmat",
   "normal": [
    ".#####.",
    "#ooooo#",
    "#ooooo#",
    "#######",
    "#######",
    ".#####.",
    ".#####.",
    ".##.##.",
    ".##.##."
   ],
   "urgent": [
    "#.###.#",
    "#ooooo#",
    "#ooooo#",
    "#######",
    "#######",
    ".#####.",
    ".#####.",
    "##...##",
    "##...##"
   ]
  },
  {
   "acc": "#c8fcc0",
   "id": "interviewee",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    ".#####.",
    ".##o##.",
    "..#o#..",
    "..#o#..",
    "..#o#.."
   ],
   "urgent": [
    "#.###.#",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".#####.",
    ".##o##.",
    "..#o#..",
    ".#.o.#.",
    ".#.o.#."
   ]
  },
  {
   "acc": "#947a50",
   "id": "jamcart",
   "normal": [
    "#.oooo.",
    "#.oooo.",
    "#oooooo",
    "#.oooo.",
    "#.oooo.",
    "#oooooo",
    "#.oooo.",
    "#oooooo",
    ".#...#."
   ],
   "urgent": [
    "#.oooo.",
    "#.oooo.",
    "#oooooo",
    "#.oooo.",
    "#.oooo.",
    "#oooooo",
    "#.oooo.",
    "#oooooo",
    "#.....#"
   ]
  },
  {
   "acc": "#558655",
   "id": "keeper",
   "normal": [
    "....###",
    "....###",
    ".....#.",
    "oooo###",
    "o..o###",
    "oooo###",
    "o..o#.#",
    "oooo#.#",
    "o.o.#.#"
   ],
   "urgent": [
    "....###",
    "#...###",
    "#....#.",
    "oooo###",
    "o..o###",
    "oooo###",
    "o..o#.#",
    "oooo#.#",
    "o.o..##"
   ]
  },
  {
   "acc": "#04a05c",
   "id": "newhire",
   "normal": [
    "..###..",
    "..###..",
    "..ooo..",
    ".o###o.",
    ".o###o.",
    ".ooooo.",
    ".#####.",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.#",
    "#.###.#",
    "#.ooo.#",
    ".o###o.",
    ".o###o.",
    ".ooooo.",
    ".#####.",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#00dbe0",
   "id": "nightlab",
   "normal": [
    ".ooooo.",
    "..###..",
    "...#...",
    ".#####.",
    ".####oo",
    ".####oo",
    "#######",
    "#######",
    ".#####."
   ],
   "urgent": [
    ".ooooo.",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".####oo",
    ".####oo",
    "#######",
    "#######",
    ".#####."
   ]
  },
  {
   "acc": "#d2ae12",
   "id": "observer",
   "normal": [
    "..###..",
    ".ooooo.",
    "...#...",
    ".#####.",
    ".#####.",
    ".#####.",
    "..#.#..",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.#",
    "#ooooo#",
    "#..#..#",
    ".#####.",
    ".#####.",
    ".#####.",
    "..#.#..",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#8a5a2b",
   "id": "office",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    ".####..",
    ".####oo",
    ".####oo",
    "..#.#..",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###..",
    "#.###..",
    "#..#...",
    ".####..",
    ".####oo",
    ".####oo",
    "..#.#..",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#7c8a9a",
   "id": "photocrew",
   "normal": [
    "ooo....",
    "oo..###",
    ".o..###",
    ".o...#.",
    ".o..###",
    ".o..###",
    "ooo.###",
    "o.o.#.#",
    "o.o.#.#"
   ],
   "urgent": [
    "ooo...#",
    "oo..###",
    ".o..###",
    ".o...#.",
    ".o#####",
    ".o..###",
    "ooo.###",
    "o.o.#.#",
    "o.o#..#"
   ]
  },
  {
   "acc": "#ff39fd",
   "id": "proposer",
   "normal": [
    "....###",
    "....###",
    ".....#.",
    "##..###",
    "##oo###",
    ".#oo###",
    "###.#.#",
    "###.#.#",
    "###.#.#"
   ],
   "urgent": [
    "....###",
    "##..###",
    "##...#.",
    ".#oo###",
    "##oo###",
    "###.###",
    "###.#.#",
    "#.#.#.#",
    "#.#.#.#"
   ]
  },
  {
   "acc": "#a894c8",
   "id": "remote",
   "normal": [
    "..###..",
    ".o###o.",
    "...#...",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#####.",
    "..#.#..",
    ".oo.oo."
   ],
   "urgent": [
    "#.###.#",
    ".o###o.",
    "#..#..#",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#...#.",
    "oo...oo"
   ]
  },
  {
   "acc": "#3ad39a",
   "id": "resident",
   "normal": [
    ".......",
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    ".####oo",
    ".####oo",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    ".......",
    "#.###.#",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".####oo",
    ".####oo",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#729cae",
   "id": "scientist",
   "normal": [
    "..###..",
    "..###..",
    "...#...",
    ".#####.",
    ".#####o",
    ".#####o",
    ".#####.",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    "#.###.#",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".#####o",
    ".#####o",
    ".#####.",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#73cbb7",
   "id": "student",
   "normal": [
    ".......",
    ".####..",
    "..##...",
    "..##...",
    "oo###..",
    "oo###..",
    "oo##...",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    ".......",
    ".####.#",
    "..##..#",
    "..##...",
    "oo###..",
    "oo###..",
    "oo##...",
    ".#...#.",
    ".#...#."
   ]
  },
  {
   "acc": "#008c68",
   "id": "tourist",
   "normal": [
    ".#####.",
    "..###..",
    "...#...",
    ".#####.",
    ".#ooo#.",
    ".#####.",
    "..#.#..",
    "..#.#..",
    "..#.#.."
   ],
   "urgent": [
    ".#####.",
    "#.###.#",
    "#..#..#",
    ".#####.",
    ".#ooo#.",
    ".#####.",
    "..#.#..",
    ".#...#.",
    ".#...#."
   ]
  }
 ]
};
