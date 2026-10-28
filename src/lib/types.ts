export type Wedding = {
  id?: string;
  slug: string;
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  ceremony_time: string;
  venue_name: string;
  venue_address: string;
  story: string;
  hero_image: string;
  gallery: string[];
  accent_color: string;
  music_url: string;
  gift_title: string;
  gift_bank_name: string;
  gift_account_name: string;
  gift_account_number: string;
  gift_qr_url: string;
  published: boolean;
};

export const defaultWedding: Wedding = {
  slug: "minh-quan-ngoc-uyen",
  groom_name: "Minh Quân",
  bride_name: "Ngọc Uyên",
  wedding_date: "2026-12-12T10:30:00+07:00",
  ceremony_time: "10:30",
  venue_name: "Tên nhà hàng / địa điểm",
  venue_address: "Địa chỉ tổ chức tiệc cưới",
  story: "Từ một cuộc gặp gỡ giản dị, chúng mình đã cùng viết nên câu chuyện của riêng mình. Sẽ thật hạnh phúc khi có bạn ở bên trong ngày đặc biệt này.",
  hero_image: "",
  gallery: [],
  accent_color: "#a98767",
  music_url: "",
  gift_title: "Lời chúc phúc là món quà quý giá nhất",
  gift_bank_name: "",
  gift_account_name: "",
  gift_account_number: "",
  gift_qr_url: "",
  published: false
};
