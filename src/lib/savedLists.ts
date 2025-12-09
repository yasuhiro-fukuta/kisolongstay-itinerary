// src/lib/savedLists.ts

export type CategoryKey = "move" | "spot" | "activity" | "food" | "stay" | "shipping";

export type SavedPlace = {
  id: string;
  name: string;
  placeId?: string;      // 必要になったら入れる
  mapUrl?: string;       // Googleマップ or Webサイト
  imageUrl?: string;     // サムネイル
  officialUrl?: string;  // 公式HP
  bookingUrl?: string;   // Booking.com など
  airbnbUrl?: string;
  rakutenUrl?: string;
  viatorUrl?: string;
};

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "move",     label: "移動" },
  { key: "spot",     label: "観光スポット" },
  { key: "activity", label: "アクティビティ" },
  { key: "food",     label: "外食" },
  { key: "stay",     label: "宿" },
  { key: "shipping", label: "荷物配送" },
];

export const SAVED_PLACES: Record<CategoryKey, SavedPlace[]> = {
  // ========= 移動 =========
  move: [
    {
      id: "ebike-reservation",
      name: "South Kiso Long Trail E-Bike Reservation",
      mapUrl: "https://preview.studio.site/live/XKOk192Ra4/en",
      imageUrl: "/img/move-ebike-reservation.jpg",
    },
    {
      id: "bus-kitaena",
      name: "バス（木曽南部 北恵那交通）",
      mapUrl: "https://kitaena.co.jp/timetable/",
      imageUrl: "/img/move-bus-kitaena.jpg",
    },
    {
      id: "bus-ontake",
      name: "バス（馬籠～妻籠～南木曾 おんたけ交通）",
      mapUrl:
        "https://www.town.nagiso.nagano.jp/data/open/cnt/3/9578/1/magome251001.pdf?20251208183048",
      imageUrl: "/img/move-bus-ontake.jpg",
    },
    {
      id: "bus-kisobus",
      name: "バス（木曽中部 きそバス）",
      mapUrl: "https://www.kisoji.com/chiikishinko/kiso-bus/documents/kansen-rosen.pdf",
      imageUrl: "/img/move-bus-kisobus.jpg",
    },
  ],

  // ========= 観光スポット =========
  spot: [
    {
      id: "magome-toge",
      name: "馬籠峠",
      mapUrl: "https://maps.app.goo.gl/yEvuyEcx7wjsP8FN7",
      imageUrl: "/img/spot-magome-toge.jpg",
    },
    {
      id: "momosuke-bashi",
      name: "桃介橋",
      mapUrl: "https://maps.app.goo.gl/uaBmQ6SWZAefJDZw9",
      imageUrl: "/img/spot-momosuke-bashi.jpg",
    },
    {
      id: "tokakuji",
      name: "等覚寺",
      mapUrl: "https://maps.app.goo.gl/3KNXQ1UDeX5vHE9N8",
      imageUrl: "/img/spot-tokakuji.jpg",
    },
    {
      id: "yokawamichi",
      name: "与川道",
      mapUrl: "https://maps.app.goo.gl/2wVVKHkbhV588n9q9",
      imageUrl: "/img/spot-yokawamichi.jpg",
    },
  ],

  // ========= アクティビティ =========
  activity: [
    {
      id: "really-rural-japan",
      name: "Really Rural Japan",
      mapUrl: "https://reallyruraljapan.com/",
      imageUrl: "/img/activity-really-rural-japan.jpg",
    },
  ],

  // ========= 外食 =========
  food: [
    {
      id: "ni-gohan-han",
      name: "二合半",
      mapUrl: "https://maps.app.goo.gl/S5eeMVm2WYUW9Zp47",
      imageUrl: "/img/food-nigohanhan.jpg",
    },
    {
      id: "riverbed-coffee",
      name: "RIVERBED COFFEE BREWER&ROASTERY",
      mapUrl: "https://maps.app.goo.gl/XE61LvDWEUkfKwQM8",
      imageUrl: "/img/food-riverbed-coffee.jpg",
    },
    {
      id: "kiseian",
      name: "恵盛庵",
      mapUrl: "https://maps.app.goo.gl/zpwu4gTAQKUkt8Xx9",
      imageUrl: "/img/food-kiseian.jpg",
    },
    {
      id: "ame-nakasendo-food",
      name: "雨 中山道",
      mapUrl: "https://maps.app.goo.gl/oXP8RAjzYRGjLAHT8",
      imageUrl: "/img/food-ame-nakasendo.jpg",
    },
    {
      id: "azumaya",
      name: "AZUMAYA あづまや",
      mapUrl: "https://maps.app.goo.gl/E4UhJogb5sub4JQB8",
      imageUrl: "/img/food-azumaya.jpg",
    },
    {
      id: "piero",
      name: "ピエロ",
      mapUrl: "https://maps.app.goo.gl/pVpq4uDH7RDW7fyj8",
      imageUrl: "/img/food-piero.jpg",
    },
    {
      id: "fukusuke",
      name: "ふくすけ",
      mapUrl: "https://maps.app.goo.gl/oKwiS6rHK2StD65n6",
      imageUrl: "/img/food-fukusuke.jpg",
    },
    {
      id: "momosuke-tei",
      name: "桃介亭",
      mapUrl: "https://maps.app.goo.gl/XMSDuRxmQxoVkRph9",
      imageUrl: "/img/food-momosuke-tei.jpg",
    },
  ],

  // ========= 宿 =========
  stay: [
    {
      id: "kashiwaya",
      name: "kashiwaya Inn 柏屋イン",
      mapUrl: "https://maps.app.goo.gl/tzLh9hLuKezAyzgV7",
      imageUrl: "/img/stay-kashiwaya.jpg",
      bookingUrl:
        "https://www.booking.com/searchresults.ja.html?aid=356980&label=gog235jc-10CAsodUINa2FzaGl3YXlhLWlubkgVWANodYgBAZgBM7gBF8gBDNgBA-gBAfgBAYgCAagCAbgCzo_fyQbAAgHSAiQ4MGVhNzZmMS02NzdjLTQ1YWItOGE1YS1mMTFiYzc4NzE4NznYAgHgAgE&highlighted_hotels=14643310&checkin=2026-02-08&redirected=1&city=900053828&hlrd=user_sh&source=hotel&checkout=2026-02-09&keep_landing=1&sid=b06b8f5d70c57eadc747048df16d148a",
      airbnbUrl:
        "https://www.airbnb.jp/rooms/1469195071434996296?guests=1&adults=1&s=67&unique_share_id=7c152dca-3853-40d4-b29b-777d700bc592",
    },
    {
      id: "suhara",
      name: "民宿すはら",
      mapUrl: "https://maps.app.goo.gl/91sn647stWw2a4gn6",
      imageUrl: "/img/stay-suhara.jpg",
      bookingUrl:
        "https://www.booking.com/hotel/jp/suhara.ja.html?aid=356980&label=gog235jc-10CAsodUINa2FzaGl3YXlhLWlubkgVWANodYgBAZgBM7gBF8gBDNgBA-gBAfgBAYgCAagCAbgCzo_fyQbAAgHSAiQ4MGVhNzZmMS02NzdjLTQ1YWItOGE1YS1mMTFiYzc4NzE4NznYAgHgAgE&sid=b06b8f5d70c57eadc747048df16d148a&age=0&all_sr_blocks=257823901_143706871_1_0_0&checkin=2026-02-08&checkout=2026-02-09&dest_id=900053828&dest_type=city&dist=0&group_adults=1&group_children=0&hapos=14&highlighted_blocks=257823901_143706871_1_0_0&hpos=14&matching_block_id=257823901_143706871_1_0_0&no_rooms=1&req_adults=1&req_children=0&room1=A&sb_price_type=total&sr_order=popularity&sr_pri_blocks=257823901_143706871_1_0_0__900000&srepoch=1765263395&srpvid=e9e030a75ca00372&type=total&ucfs=1&",
    },
    {
      id: "sakanomichi",
      name: "さかのみち",
      mapUrl: "https://maps.app.goo.gl/YkNCuf7ozctVCif68",
      imageUrl: "/img/stay-sakanomichi.jpg",
      bookingUrl:
        "https://booking.com/hotel/jp/sakanomiti.ja.html?label=gog235jc-10CAsodUIKc2FrYW5vbWl0aUgVWANodYgBAZgBM7gBF8gBDNgBA-gBAfgBAYgCAagCAbgC2ZDfyQbAAgHSAiRiZTA4OGI1ZS1lY2YwLTQwNWItODU1OS01ZmVhNjA2YTA1ZWXYAgHgAgE&sid=b06b8f5d70c57eadc747048df16d148a&aid=356980&ucfs=1&arphpl=1&checkin=2026-02-08&checkout=2026-02-09&dest_id=-238265&dest_type=city&group_adults=1&req_adults=1&no_rooms=1&group_children=0&req_children=0&hpos=1&hapos=1&sr_order=popularity&srpvid=af3030edec4d007a&srepoch=1765263457&soh=1&from=searchresults#no_availability_msg",
    },
    {
      id: "onn-nakatsugawa",
      name: "お宿Onn中津川",
      mapUrl: "https://maps.app.goo.gl/hbdVC2SxfqyL4fMn6",
      imageUrl: "/img/stay-onn-nakatsugawa.jpg",
    },
    {
      id: "the-ryokan-o",
      name: "The RYOKAN O",
      mapUrl: "https://maps.app.goo.gl/R6eFqUAvvV8Wc1jr9",
      imageUrl: "/img/stay-the-ryokan-o.jpg",
    },
    {
      id: "guesthouse-shigi",
      name: "Guesthouse SHIGI",
      mapUrl: "https://maps.app.goo.gl/a7DHBFmGuR4T5hhe9",
      imageUrl: "/img/stay-guesthouse-shigi.jpg",
    },
    {
      id: "ame-nakasendo-stay",
      name: "雨 中山道",
      mapUrl: "https://maps.app.goo.gl/oXP8RAjzYRGjLAHT8",
      imageUrl: "/img/stay-ame-nakasendo.jpg",
    },
  ],

  // ========= 荷物配送 =========
  shipping: [
    {
      id: "nlts",
      name: "NLTS（荷物転送サービス）",
      mapUrl: "https://magome-luggagetransport.jp/",
      imageUrl: "/img/shipping-nlts.jpg",
    },
  ],
};
