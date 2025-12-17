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

export type SavedPlace = {
  id: string;
  name: string;
  mapUrl: string;
  imageUrl?: string;
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

export const SAVED_PLACES: Record<CategoryKey, SavedPlace[]> = {
  tsumago: [
    {
      id: "tsumago-cafe-kojitsu",
      name: "好日珈琲",
      mapUrl: "https://maps.app.goo.gl/qdLkEfSfSPmrQJxz6",
      imageUrl: "/img/tsumago-cafe-kojitsu.jpg",
    },
    {
      id: "tsumago-hotel-hanaya",
      name: "波奈屋",
      mapUrl: "https://maps.app.goo.gl/fmnfEy9ZpkKycQDw7",
      imageUrl: "/img/tsumago-hotel-hanaya.jpg",
    },
    {
      id: "tsumago-restaurant-fujioto",
      name: "藤乙",
      mapUrl: "https://maps.app.goo.gl/AGxKyN3GjCng7Ded8",
      imageUrl: "/img/tsumago-restaurant-fujioto.jpg",
    },
    {
      id: "tsumago-restaurant-otokichi",
      name: "御食事処 音吉",
      mapUrl: "https://maps.app.goo.gl/2Y2V7hnPtNZsDHsA9",
      imageUrl: "/img/tsumago-restaurant-otokichi.jpg",
    },
    {
      id: "tsumago-street-tsumago",
      name: "妻籠宿",
      mapUrl: "https://maps.app.goo.gl/7Nr6oxSzKXGCGBUw8",
      imageUrl: "/img/tsumago-street-tsumago.jpg",
    },
  ],

  araragi: [
    {
      id: "araragi-trail-mtnagiso",
      name: "南木曽岳",
      mapUrl: "https://maps.app.goo.gl/zG6yiHrTWBzPeXcA7",
      imageUrl: "/img/araragi-trail-mtnagiso.jpg",
    },
    {
      id: "araragi-hotel-taoya",
      name: "TAOYA木曽路",
      mapUrl: "https://maps.app.goo.gl/cwHGotxurgdwB1kg7",
      imageUrl: "/img/araragi-hotel-taoya.jpg",
    },
    {
      id: "araragi-lunch-mannya",
      name: "萬屋（予約制）",
      mapUrl: "https://maps.app.goo.gl/fpo9XJ2UWjoPjW92A",
      imageUrl: "/img/araragi-lunch-mannya.jpg",
    },
  ],

  tadachi: [
    {
      id: "tadachi-fishing-takahashigorge",
      name: "高橋渓流",
      mapUrl: "https://maps.app.goo.gl/eZEC1B3i3RqkyFUy5",
      imageUrl: "/img/tadachi-fishing-takahashigorge.jpg",
    },
    {
      id: "tadachi-hotel-okaniwa",
      name: "丘庭",
      mapUrl: "https://maps.app.goo.gl/HJ1tBDZtb8xiaSRV8",
      imageUrl: "/img/tadachi-hotel-okaniwa.jpg",
    },
    {
      id: "tadachi-train-tadachi",
      name: "田立駅",
      mapUrl: "https://maps.app.goo.gl/en6FB8uHcMZyELbt5",
      imageUrl: "/img/tadachi-train-tadachi.jpg",
    },
  ],

  nagiso: [
    {
      id: "nagiso-bridge-momosuke",
      name: "桃介橋",
      mapUrl: "https://maps.app.goo.gl/hvzCffr9rDTZUkZeA",
      imageUrl: "/img/nagiso-bridge-momosuke.jpg",
    },
    {
      id: "nagiso-cafe-ame",
      name: "雨 中山道(カフェ)",
      mapUrl: "https://maps.app.goo.gl/WZi6gUnMrX1ugEUG6",
      imageUrl: "/img/nagiso-cafe-ame.jpg",
    },
    {
      id: "nagiso-cafe-izumiya",
      name: "Izumiya",
      mapUrl: "https://maps.app.goo.gl/k6EAeWvWeH65tXVr7",
      imageUrl: "/img/nagiso-cafe-izumiya.jpg",
    },
    {
      id: "nagiso-cafe-momosuketei",
      name: "桃介亭",
      mapUrl: "https://maps.app.goo.gl/zFF6SANKKWToeaeV9",
      imageUrl: "/img/nagiso-cafe-momosuketei.jpg",
    },
    {
      id: "nagiso-cyclestreet-batokannon",
      name: "馬頭観音(サイクルコース)",
      mapUrl: "https://maps.app.goo.gl/JjQsoDMvZrCkdbT26",
      imageUrl: "/img/nagiso-cyclestreet-batokannon.jpg",
    },
    {
      id: "nagiso-cyclestreet-route19",
      name: "19号側道(サイクルコース)",
      mapUrl: "https://maps.app.goo.gl/VqyM7QPrAqtiwwdE6",
      imageUrl: "/img/nagiso-cyclestreet-route19.jpg",
    },
    {
      id: "nagiso-free_e_bike-hashimotoya",
      name: "橋本屋（無料Ebikeステーション）",
      mapUrl: "https://maps.app.goo.gl/a2fDxn2iHbKiMZqw9",
      imageUrl: "/img/nagiso-free_e_bike-hashimotoya.jpg",
    },
    {
      id: "nagiso-goods-kosaten",
      name: "交叉点",
      mapUrl: "https://maps.app.goo.gl/tcw8Gx5zckC79WPr7",
      imageUrl: "/img/nagiso-goods-kosaten.jpg",
    },
    {
      id: "nagiso-hotel-ame",
      name: "雨 中山道(宿)",
      mapUrl: "https://maps.app.goo.gl/WZi6gUnMrX1ugEUG6",
      imageUrl: "/img/nagiso-hotel-ame.jpg",
    },
    {
      id: "nagiso-hotel-kashiwaya",
      name: "kashiwaya Inn",
      mapUrl: "https://maps.app.goo.gl/Cgr3i94ju3NQCjubA",
      imageUrl: "/img/nagiso-hotel-kashiwaya.jpg",
    },
    {
      id: "nagiso-hotel-mountainn",
      name: "Mountainn",
      mapUrl: "https://maps.app.goo.gl/oEzbtPVtukT1zsF18",
      imageUrl: "/img/nagiso-hotel-mountainn.jpg",
    },
    {
      id: "nagiso-hotel-tsumugitei",
      name: "tsumugi tei",
      mapUrl: "https://maps.app.goo.gl/nYKWu92sRcQJGtEn7",
      imageUrl: "/img/nagiso-hotel-tsumugitei.jpg",
    },
    {
      id: "nagiso-hotel-yamo",
      name: "YAMO",
      mapUrl: "https://maps.app.goo.gl/ty79pAzpAhiw7sP6A",
      imageUrl: "/img/nagiso-hotel-yamo.jpg",
    },
    {
      id: "nagiso-lunch-fukusuke",
      name: "ふくすけ",
      mapUrl: "https://maps.app.goo.gl/a1uYtvPR5iAE3iYV9",
      imageUrl: "/img/nagiso-lunch-fukusuke.jpg",
    },
    {
      id: "nagiso-museum-woodhistory",
      name: "山の歴史館",
      mapUrl: "https://maps.app.goo.gl/tRNbK4mJL2M7cMdx6",
      imageUrl: "/img/nagiso-museum-woodhistory.jpg",
    },
    {
      id: "nagiso-restaurant-azumaya",
      name: "AZUMAYA",
      mapUrl: "https://maps.app.goo.gl/aVPYmohiSdfbczyHA",
      imageUrl: "/img/nagiso-restaurant-azumaya.jpg",
    },
    {
      id: "nagiso-restaurant-pierrot",
      name: "ピエロ",
      mapUrl: "https://maps.app.goo.gl/2g7N6QXA7VSMbVzz6",
      imageUrl: "/img/nagiso-restaurant-pierrot.jpg",
    },
    {
      id: "nagiso-street-agatsuma",
      name: "中山道(吾妻)",
      mapUrl: "https://maps.app.goo.gl/iQfvicpnEc9nnZNq7",
      imageUrl: "/img/nagiso-street-agatsuma.jpg",
    },
    {
      id: "nagiso-street-midono",
      name: "三留野宿",
      mapUrl: "https://maps.app.goo.gl/k25ftVMD3UeKkSzB7",
      imageUrl: "/img/nagiso-street-midono.jpg",
    },
  ],

  yogawa: [
    {
      id: "yogawa-camp-ties",
      name: "ties",
      mapUrl: "https://maps.app.goo.gl/4Go5AF253Bq6EgoQ6",
      imageUrl: "/img/yogawa-camp-ties.jpg",
    },
    {
      id: "yogawa-hotel-yuian",
      name: "結い庵",
      mapUrl: "https://maps.app.goo.gl/FqCTwZ4fQXcmbwD49",
      imageUrl: "/img/yogawa-hotel-yuian.jpg",
    },
    {
      id: "yogawa-trail-nenoue",
      name: "根の上峠",
      mapUrl: "https://maps.app.goo.gl/E5jdcdvMb8Ht7dAe7",
      imageUrl: "/img/yogawa-trail-nenoue.jpg",
    },
    {
      id: "yogawa-trail-yogawa",
      name: "与川道",
      mapUrl: "https://maps.app.goo.gl/ybEW1VD71LnNHLz66",
      imageUrl: "/img/yogawa-trail-yogawa.jpg",
    },
  ],

  kakizore: [
    {
      id: "kakizore-bridge-koiji",
      name: "恋路のつり橋",
      mapUrl: "https://maps.app.goo.gl/Pe7AcCoFKwKGaHyo6",
      imageUrl: "/img/kakizore-bridge-koiji.jpg",
    },
    {
      id: "kakizore-gorge-kakizoreemerald",
      name: "柿其黒淵",
      mapUrl: "https://maps.app.goo.gl/BKxD1jrCZEpXTpq69",
      imageUrl: "/img/kakizore-gorge-kakizoreemerald.jpg",
    },
    {
      id: "kakizore-hotel-hoteiya",
      name: "ほていや",
      mapUrl: "https://maps.app.goo.gl/McGi219MuUuSPp9fA",
      imageUrl: "/img/kakizore-hotel-hoteiya.jpg",
    },
    {
      id: "kakizore-peak-koiji",
      name: "恋路峠 展望台",
      mapUrl: "https://maps.app.goo.gl/C71p624ZKhwEz8V57",
      imageUrl: "/img/kakizore-peak-koiji.jpg",
    },
    {
      id: "kakizore-rest-kikori",
      name: "きこりの家",
      mapUrl: "https://maps.app.goo.gl/iBcHnxVjtdB8pyDw7",
      imageUrl: "/img/kakizore-rest-kikori.jpg",
    },
  ],

  atera: [
    {
      id: "atera-gorge-aterasapphire",
      name: "阿寺狸ヶ淵",
      mapUrl: "https://maps.app.goo.gl/4rS7F6sLWBZMoZfj6",
      imageUrl: "/img/atera-gorge-aterasapphire.jpg",
    },
    {
      id: "atera-hotel-ateraso",
      name: "あてら荘（ホテル）",
      mapUrl: "https://maps.app.goo.gl/dqFHfErwcjy284iT8",
      imageUrl: "/img/atera-hotel-ateraso.jpg",
    },
    {
      id: "atera-lunch-inaho",
      name: "いなほ",
      mapUrl: "https://maps.app.goo.gl/YsxCMvpJEyZntNZG8",
      imageUrl: "/img/atera-lunch-inaho.jpg",
    },
    {
      id: "atera-onsen-ateraso",
      name: "あてら荘（温泉）",
      mapUrl: "https://maps.app.goo.gl/dqFHfErwcjy284iT8",
      imageUrl: "/img/atera-onsen-ateraso.jpg",
    },
  ],

  nojiri: [
    {
      id: "nojiri-cafe-donguri",
      name: "どんぐり",
      mapUrl: "https://maps.app.goo.gl/yHVv9JD4TwzEKmZy6",
      imageUrl: "/img/nojiri-cafe-donguri.jpg",
    },
    {
      id: "nojiri-cafe-katana",
      name: "珈琲 刀",
      mapUrl: "https://maps.app.goo.gl/KKvrKp5P967o1PiS6",
      imageUrl: "/img/nojiri-cafe-katana.jpg",
    },
    {
      id: "nojiri-street-nojiri",
      name: "野尻宿",
      mapUrl: "https://maps.app.goo.gl/MfLAnnAUt8hs6qse9",
      imageUrl: "/img/nojiri-street-nojiri.jpg",
    },
    {
      id: "nojiri-train-nojiri",
      name: "野尻駅",
      mapUrl: "https://maps.app.goo.gl/ZLq1ptL9af5nhNEYA",
      imageUrl: "/img/nojiri-train-nojiri.jpg",
    },
  ],

  suhara: [
    {
      id: "suhara-street-suhara",
      name: "須原宿",
      mapUrl: "https://maps.app.goo.gl/e4ZQtSaETZ7upAYeA",
      imageUrl: "/img/suhara-street-suhara.jpg",
    },
    {
      id: "suhara-train-suhara",
      name: "須原駅",
      mapUrl: "https://maps.app.goo.gl/CDvfcPEXm4iKZxTE9",
      imageUrl: "/img/suhara-train-suhara.jpg",
    },
    {
      id: "suhara-dinner-honjin",
      name: "本陣",
      mapUrl: "https://maps.app.goo.gl/pvAYnLibkfuU1Xig6",
      imageUrl: "/img/suhara-dinner-honjin.jpg",
    },
    {
      id: "suhara-hotel-minshukusuhara",
      name: "民宿すはら",
      mapUrl: "https://maps.app.goo.gl/3zTiqym1T7zY9L4x7",
      imageUrl: "/img/suhara-hotel-minshukusuhara.jpg",
    },
  ],
};
