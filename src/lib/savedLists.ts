// src/lib/savedLists.ts

export type CategoryKey =
  | "tsumago"
  | "tadachi"
  | "araragi"
  | "nagiso"
  | "yogawa"
  | "kakizore"
  | "atera"
  | "nojiri"
  | "suhara";

export type PlaceKind =
  | "cafe"
  | "brewery"
  | "trail"
  | "gorge"
  | "river"
  | "restaurant"
  | "lunch"
  | "dinner"
  | "hotel"
  | "street"
  | "train"
  | "bridge"
  | "camp"
  | "museum"
  | "cycle"
  | "onsen"
  | "goods"
  | "fishing"
  | "other";

export type SavedPlace = {
  id: string;
  name: string;

  // Google Map URL（今のアプリの動線はこれでOK）
  mapUrl?: string;

  // 画像（public/img に置いて /img/... で参照）
  imageUrl?: string;

  // アイコン表示用（未指定なら id から推測する）
  kind?: PlaceKind;

  // 将来拡張用（必要になったら）
  officialUrl?: string;
  bookingUrl?: string;
  airbnbUrl?: string;
  rakutenUrl?: string;
  viatorUrl?: string;
};

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "tsumago", label: "妻籠" },
  { key: "tadachi", label: "田立" },
  { key: "araragi", label: "蘭" },
  { key: "nagiso", label: "南木曽" },
  { key: "yogawa", label: "与川" },
  { key: "kakizore", label: "柿其" },
  { key: "atera", label: "阿寺" },
  { key: "nojiri", label: "野尻" },
  { key: "suhara", label: "須原" },
];

function img(name: string) {
  // 画像は public/img/ に置く想定
  return `/img/${name}`;
}

export const SAVED_PLACES: Record<CategoryKey, SavedPlace[]> = {
  // ========= 妻籠 =========
  tsumago: [
    {
      id: "tsumago-cafe-kojitsu",
      name: "好日珈琲",
      mapUrl: "https://maps.app.goo.gl/qdLkEfSfSPmrQJxz6",
      imageUrl: img("tsumago-cafe-kojitsu.jpg"),
      kind: "cafe",
    },
    {
      id: "tsumago-hotel-hanaya",
      name: "波奈屋",
      mapUrl: "https://maps.app.goo.gl/fmnfEy9ZpkKycQDw7",
      imageUrl: img("tsumago-hotel-hanaya.jpg"),
      kind: "hotel",
    },
    {
      id: "tsumago-restaurant-fujioto",
      name: "藤乙",
      mapUrl: "https://maps.app.goo.gl/AGxKyN3GjCng7Ded8",
      imageUrl: img("tsumago-restaurant-fujioto.jpg"),
      kind: "restaurant",
    },
    {
      id: "tsumago-restaurant-otokichi",
      name: "御食事処 音吉",
      mapUrl: "https://maps.app.goo.gl/2Y2V7hnPtNZsDHsA9",
      imageUrl: img("tsumago-restaurant-otokichi.jpg"),
      kind: "restaurant",
    },
    {
      id: "tsumago-street-tsumago",
      name: "妻籠宿",
      mapUrl: "https://maps.app.goo.gl/7Nr6oxSzKXGCGBUw8",
      imageUrl: img("tsumago-street-tsumago.jpg"),
      kind: "street",
    },
  ],

  // ========= 田立 =========
  tadachi: [
    {
      id: "tadachi-fishing-takahashigorge",
      name: "高橋渓流",
      mapUrl: "https://maps.app.goo.gl/eZEC1B3i3RqkyFUy5",
      imageUrl: img("tadachi-fishing-takahashigorge.jpg"),
      kind: "fishing",
    },
    {
      id: "tadachi-hotel-okaniwa",
      name: "丘庭",
      mapUrl: "https://maps.app.goo.gl/HJ1tBDZtb8xiaSRV8",
      // ※メッセージ内で拡張子が省略されていたので .jpg で置いてます
      // もしファイル名が違うならここだけ直してください
      imageUrl: img("tadachi-hotel-okaniwa.jpg"),
      kind: "hotel",
    },
    {
      id: "tadachi-train-tadachi",
      name: "田立駅",
      mapUrl: "https://maps.app.goo.gl/en6FB8uHcMZyELbt5",
      imageUrl: img("tadachi-train-tadachi.jpg"),
      kind: "train",
    },
  ],

  // ========= 蘭 =========
  araragi: [
    {
      id: "araragi-trail-mtnagiso",
      name: "南木曽岳",
      mapUrl: "https://maps.app.goo.gl/zG6yiHrTWBzPeXcA7",
      imageUrl: img("araragi-trail-mtnagiso.jpg"),
      kind: "trail",
    },
    {
      id: "araragi-hotel-taoya",
      name: "TAOYA木曽路",
      mapUrl: "https://maps.app.goo.gl/cwHGotxurgdwB1kg7",
      imageUrl: img("araragi-hotel-taoya.jpg"),
      kind: "hotel",
    },
    {
      id: "araragi-lunch-mannya",
      name: "萬屋（予約制）",
      mapUrl: "https://maps.app.goo.gl/fpo9XJ2UWjoPjW92A",
      imageUrl: img("araragi-lunch-mannya.jpg"),
      kind: "lunch",
    },
  ],

  // ========= 南木曽 =========
  nagiso: [
    {
      id: "nagiso-bridge-momosuke",
      name: "桃介橋",
      mapUrl: "https://maps.app.goo.gl/hvzCffr9rDTZUkZeA",
      imageUrl: img("nagiso-bridge-momosuke.jpg"),
      kind: "bridge",
    },
    {
      id: "nagiso-cafe-ame",
      name: "雨 中山道(カフェ)",
      mapUrl: "https://maps.app.goo.gl/WZi6gUnMrX1ugEUG6",
      imageUrl: img("nagiso-cafe-ame.jpg"),
      kind: "cafe",
    },
    {
      id: "nagiso-cafe-izumiya",
      name: "Izumiya",
      mapUrl: "https://maps.app.goo.gl/k6EAeWvWeH65tXVr7",
      imageUrl: img("nagiso-cafe-izumiya.jpg"),
      kind: "cafe",
    },
    {
      id: "nagiso-cafe-momosuketei",
      name: "桃介亭",
      mapUrl: "https://maps.app.goo.gl/zFF6SANKKWToeaeV9",
      imageUrl: img("nagiso-cafe-momosuketei.jpg"),
      kind: "cafe",
    },
    {
      id: "nagiso-cyclestreet-batokannon",
      name: "馬頭観音(サイクルコース)",
      mapUrl: "https://maps.app.goo.gl/JjQsoDMvZrCkdbT26",
      imageUrl: img("nagiso-cyclestreet-batokannon.jpg"),
      kind: "cycle",
    },
    {
      id: "nagiso-cyclestreet-route19",
      name: "19号側道(サイクルコース)",
      mapUrl: "https://maps.app.goo.gl/VqyM7QPrAqtiwwdE6",
      imageUrl: img("nagiso-cyclestreet-route19.jpg"),
      kind: "cycle",
    },
    {
      id: "nagiso-free_e_bike-hashimotoya",
      name: "橋本屋（無料Ebikeステーション）",
      mapUrl: "https://maps.app.goo.gl/a2fDxn2iHbKiMZqw9",
      imageUrl: img("nagiso-free_e_bike-hashimotoya.jpg"),
      kind: "cycle",
    },
    {
      id: "nagiso-goods-kosaten",
      name: "交叉点",
      mapUrl: "https://maps.app.goo.gl/tcw8Gx5zckC79WPr7",
      imageUrl: img("nagiso-goods-kosaten.jpg"),
      kind: "goods",
    },
    {
      id: "nagiso-hotel-ame",
      name: "雨 中山道(宿)",
      mapUrl: "https://maps.app.goo.gl/WZi6gUnMrX1ugEUG6",
      imageUrl: img("nagiso-hotel-ame.jpg"),
      kind: "hotel",
    },
    {
      id: "nagiso-hotel-kashiwaya",
      name: "kashiwaya Inn",
      mapUrl: "https://maps.app.goo.gl/Cgr3i94ju3NQCjubA",
      imageUrl: img("nagiso-hotel-kashiwaya.jpg"),
      kind: "hotel",
    },
    {
      id: "nagiso-hotel-mountainn",
      name: "Mountainn",
      mapUrl: "https://maps.app.goo.gl/oEzbtPVtukT1zsF18",
      imageUrl: img("nagiso-hotel-mountainn.jpg"),
      kind: "hotel",
    },
    {
      id: "nagiso-hotel-tsumugitei",
      name: "tsumugi tei",
      mapUrl: "https://maps.app.goo.gl/nYKWu92sRcQJGtEn7",
      imageUrl: img("nagiso-hotel-tsumugitei.jpg"),
      kind: "hotel",
    },
    {
      id: "nagiso-hotel-yamo",
      name: "YAMO",
      mapUrl: "https://maps.app.goo.gl/ty79pAzpAhiw7sP6A",
      imageUrl: img("nagiso-hotel-yamo.jpg"),
      kind: "hotel",
    },
    {
      id: "nagiso-lunch-fukusuke",
      name: "ふくすけ",
      mapUrl: "https://maps.app.goo.gl/a1uYtvPR5iAE3iYV9",
      imageUrl: img("nagiso-lunch-fukusuke.jpg"),
      kind: "lunch",
    },
    {
      id: "nagiso-museum-woodhistory",
      name: "山の歴史館",
      mapUrl: "https://maps.app.goo.gl/tRNbK4mJL2M7cMdx6",
      imageUrl: img("nagiso-museum-woodhistory.jpg"),
      kind: "museum",
    },
    {
      id: "nagiso-restaurant-azumaya",
      name: "AZUMAYA",
      mapUrl: "https://maps.app.goo.gl/aVPYmohiSdfbczyHA",
      imageUrl: img("nagiso-restaurant-azumaya.jpg"),
      kind: "restaurant",
    },
    {
      id: "nagiso-restaurant-pierrot",
      name: "ピエロ",
      mapUrl: "https://maps.app.goo.gl/2g7N6QXA7VSMbVzz6",
      imageUrl: img("nagiso-restaurant-pierrot.jpg"),
      kind: "restaurant",
    },
    {
      id: "nagiso-street-agatsuma",
      name: "中山道(吾妻)",
      mapUrl: "https://maps.app.goo.gl/iQfvicpnEc9nnZNq7",
      imageUrl: img("nagiso-street-agatsuma.jpg"),
      kind: "street",
    },
    {
      id: "nagiso-street-midono",
      name: "三留野宿",
      mapUrl: "https://maps.app.goo.gl/k25ftVMD3UeKkSzB7",
      imageUrl: img("nagiso-street-midono.jpg"),
      kind: "street",
    },
  ],

  // ========= 与川 =========
  yogawa: [
    {
      id: "yogawa-camp-ties",
      name: "ties",
      mapUrl: "https://maps.app.goo.gl/4Go5AF253Bq6EgoQ6",
      imageUrl: img("yogawa-camp-ties.jpg"),
      kind: "camp",
    },
    {
      id: "yogawa-hotel-yuian",
      name: "結い庵",
      mapUrl: "https://maps.app.goo.gl/FqCTwZ4fQXcmbwD49",
      imageUrl: img("yogawa-hotel-yuian.jpg"),
      kind: "hotel",
    },
    {
      id: "yogawa-trail-nenoue",
      name: "根の上峠",
      mapUrl: "https://maps.app.goo.gl/E5jdcdvMb8Ht7dAe7",
      imageUrl: img("yogawa-trail-nenoue.jpg"),
      kind: "trail",
    },
    {
      id: "yogawa-trail-yogawa",
      name: "与川道",
      mapUrl: "https://maps.app.goo.gl/ybEW1VD71LnNHLz66",
      imageUrl: img("yogawa-trail-yogawa.jpg"),
      kind: "trail",
    },
  ],

  // ========= 柿其 =========
  kakizore: [
    {
      id: "kakizore-bridge-koiji",
      name: "恋路のつり橋",
      mapUrl: "https://maps.app.goo.gl/Pe7AcCoFKwKGaHyo6",
      imageUrl: img("kakizore-bridge-koiji.jpg"),
      kind: "bridge",
    },
    {
      id: "kakizore-gorge-kakizoreemerald",
      name: "柿其黒淵",
      mapUrl: "https://maps.app.goo.gl/BKxD1jrCZEpXTpq69",
      imageUrl: img("kakizore-gorge-kakizoreemerald.jpg"),
      kind: "gorge",
    },
    {
      id: "kakizore-hotel-hoteiya",
      name: "ほていや",
      mapUrl: "https://maps.app.goo.gl/McGi219MuUuSPp9fA",
      imageUrl: img("kakizore-hotel-hoteiya.jpg"),
      kind: "hotel",
    },
    {
      id: "kakizore-peak-koiji",
      name: "恋路峠 展望台",
      mapUrl: "https://maps.app.goo.gl/C71p624ZKhwEz8V57",
      imageUrl: img("kakizore-peak-koiji.jpg"),
      kind: "trail",
    },
    {
      id: "kakizore-rest-kikori",
      name: "きこりの家",
      mapUrl: "https://maps.app.goo.gl/iBcHnxVjtdB8pyDw7",
      imageUrl: img("kakizore-rest-kikori.jpg"),
      kind: "restaurant",
    },
  ],

  // ========= 阿寺 =========
  atera: [
    {
      id: "atera-gorge-aterasapphire",
      name: "阿寺狸ヶ淵",
      mapUrl: "https://maps.app.goo.gl/4rS7F6sLWBZMoZfj6",
      imageUrl: img("atera-gorge-aterasapphire.jpg"),
      kind: "gorge",
    },
    {
      id: "atera-hotel-ateraso",
      name: "あてら荘（ホテル）",
      mapUrl: "https://maps.app.goo.gl/dqFHfErwcjy284iT8",
      imageUrl: img("atera-hotel-ateraso.jpg"),
      kind: "hotel",
    },
    {
      id: "atera-lunch-inaho",
      name: "いなほ",
      mapUrl: "https://maps.app.goo.gl/YsxCMvpJEyZntNZG8",
      imageUrl: img("atera-lunch-inaho.jpg"),
      kind: "lunch",
    },
    {
      id: "atera-onsen-ateraso",
      name: "あてら荘（温泉）",
      mapUrl: "https://maps.app.goo.gl/dqFHfErwcjy284iT8",
      imageUrl: img("atera-onsen-ateraso.jpg"),
      kind: "onsen",
    },
  ],

  // ========= 野尻 =========
  nojiri: [
    {
      id: "nojiri-cafe-donguri",
      name: "どんぐり",
      mapUrl: "https://maps.app.goo.gl/yHVv9JD4TwzEKmZy6",
      imageUrl: img("nojiri-cafe-donguri.jpg"),
      kind: "cafe",
    },
    {
      id: "nojiri-cafe-katana",
      name: "珈琲 刀",
      mapUrl: "https://maps.app.goo.gl/KKvrKp5P967o1PiS6",
      imageUrl: img("nojiri-cafe-katana.jpg"),
      kind: "cafe",
    },
    {
      id: "nojiri-street-nojiri",
      name: "野尻宿",
      mapUrl: "https://maps.app.goo.gl/MfLAnnAUt8hs6qse9",
      imageUrl: img("nojiri-street-nojiri.jpg"),
      kind: "street",
    },
    {
      id: "nojiri-train-nojiri",
      name: "野尻駅",
      mapUrl: "https://maps.app.goo.gl/ZLq1ptL9af5nhNEYA",
      imageUrl: img("nojiri-train-nojiri.jpg"),
      kind: "train",
    },
  ],

  // ========= 須原 =========
  suhara: [
    {
      id: "suhara-street-suhara",
      name: "須原宿",
      mapUrl: "https://maps.app.goo.gl/e4ZQtSaETZ7upAYeA",
      imageUrl: img("suhara-street-suhara.jpg"),
      kind: "street",
    },
    {
      id: "suhara-train-suhara",
      name: "須原駅",
      mapUrl: "https://maps.app.goo.gl/CDvfcPEXm4iKZxTE9",
      imageUrl: img("suhara-train-suhara.jpg"),
      kind: "train",
    },
    {
      id: "suhara-dinner-honjin",
      name: "本陣",
      mapUrl: "https://maps.app.goo.gl/pvAYnLibkfuU1Xig6",
      imageUrl: img("suhara-dinner-honjin.jpg"),
      kind: "dinner",
    },
    {
      id: "suhara-hotel-minshukusuhara",
      name: "民宿すはら",
      mapUrl: "https://maps.app.goo.gl/3zTiqym1T7zY9L4x7",
      imageUrl: img("suhara-hotel-minshukusuhara.jpg"),
      kind: "hotel",
    },
  ],
};
