 "use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { defaultWedding, type Wedding } from "@/lib/types";

function guestFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("guest") || "";
}
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Ho_Chi_Minh" });
}

export default function WeddingPage() {
  const [w, setW] = useState<Wedding>(defaultWedding);
  const [guest, setGuest] = useState("");
  const [opened, setOpened] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [attendance, setAttendance] = useState("yes");
  const [guestCount, setGuestCount] = useState("1");
  const [rsvpNote, setRsvpNote] = useState("");
  const [wishName, setWishName] = useState("");
  const [wishText, setWishText] = useState("");
  const [wishes, setWishes] = useState<{guest_name:string;message:string;created_at:string}[]>([]);
  const [message, setMessage] = useState("");
  const [qrData, setQrData] = useState("");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    setGuest(guestFromUrl());
    if (!supabase) return;
    supabase.from("weddings").select("*").eq("slug", defaultWedding.slug).eq("published", true).maybeSingle()
      .then(({data}) => { if (data) setW(data as Wedding); });
    supabase.from("wishes").select("guest_name,message,created_at").eq("wedding_slug", defaultWedding.slug).eq("approved", true).order("created_at",{ascending:false}).limit(30)
      .then(({data}) => { if (data) setWishes(data); });
  }, [supabase]);

  useEffect(() => {
    if (!w.gift_qr_url && w.gift_bank_name && w.gift_account_number) {
      const url = `https://img.vietqr.io/image/${encodeURIComponent(w.gift_bank_name)}-${encodeURIComponent(w.gift_account_number)}-compact2.png?accountName=${encodeURIComponent(w.gift_account_name)}`;
      setQrData(url);
    } else setQrData(w.gift_qr_url || "");
  }, [w]);

  async function sendRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvpName.trim()) { setMessage("Bạn vui lòng nhập tên nhé."); return; }
    if (!supabase) { setMessage("Cần cấu hình Supabase để gửi xác nhận trực tuyến."); return; }
    const {error} = await supabase.from("rsvps").insert({
      wedding_slug:w.slug, guest_name:rsvpName.trim(), attending:attendance==="yes",
      guest_count:attendance==="yes" ? Number(guestCount) : 0, note:rsvpNote.trim().slice(0,500)
    });
    setMessage(error ? "Chưa gửi được. Bạn thử lại sau nhé." : "Cảm ơn bạn! Xác nhận tham dự đã được gửi.");
    if (!error) { setRsvpName(""); setRsvpNote(""); }
  }

  async function sendWish(e: React.FormEvent) {
    e.preventDefault();
    if (!wishName.trim() || !wishText.trim()) { setMessage("Bạn vui lòng điền tên và lời chúc."); return; }
    if (!supabase) { setMessage("Cần cấu hình Supabase để gửi lời chúc trực tuyến."); return; }
    const {error} = await supabase.from("wishes").insert({
      wedding_slug:w.slug, guest_name:wishName.trim().slice(0,100), message:wishText.trim().slice(0,1000), approved:false
    });
    setMessage(error ? "Chưa gửi được lời chúc. Bạn thử lại sau nhé." : "Lời chúc đã được gửi và sẽ hiển thị sau khi được duyệt.");
    if (!error) { setWishName(""); setWishText(""); }
  }

  async function shareLink() {
    const url = new URL(window.location.href);
    if (guest) url.searchParams.set("guest", guest);
    try { await navigator.clipboard.writeText(url.toString()); setMessage("Đã sao chép link thiệp cá nhân hóa."); }
    catch { setMessage(url.toString()); }
  }

  const dateText = formatDate(w.wedding_date);
  const personalGreeting = guest ? `Thân mời ${guest}` : "Trân trọng kính mời bạn";

  return <main>
    {!opened && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#e8dfd2] px-6 text-center transition-all">
      <div className="max-w-lg">
        <p className="text-xs uppercase tracking-[.4em] text-stone-600">A little invitation</p>
        <div className="mx-auto my-8 h-px w-20 bg-[#a98767]" />
        <h1 className="serif text-5xl sm:text-6xl">{w.groom_name} <span className="italic text-[#a98767]">&</span> {w.bride_name}</h1>
        <p className="mt-5 text-sm text-stone-600">{dateText}</p>
        <p className="mt-8">{personalGreeting}</p>
        <button onClick={()=>setOpened(true)} className="mt-7 rounded-full bg-[#29251f] px-8 py-4 text-sm text-white hover:bg-[#514638]">Mở thiệp cưới ✦</button>
        <p className="mt-5 text-xs text-stone-500">Chạm để khám phá lời mời</p>
      </div>
    </div>}
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm">
      <a href="#" className="uppercase tracking-[.25em]">Our Wedding</a>
      <div className="flex gap-2">
        <button onClick={shareLink} className="rounded-full border border-stone-300 px-4 py-2 hover:bg-white">Sao chép link</button>
        {w.music_url && <button onClick={()=>setMusicOn(!musicOn)} className="rounded-full border border-stone-300 px-4 py-2">{musicOn?"Tắt nhạc ♫":"Bật nhạc ♫"}</button>}
      </div>
      {w.music_url && <audio src={w.music_url} autoPlay={musicOn} loop />}
    </nav>

    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center overflow-hidden rounded-[2rem] bg-[#e8dfd2] px-6 py-20 text-center">
      {w.hero_image && <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{backgroundImage:`url(${w.hero_image})`}} />}
      <div className="relative max-w-3xl">
        <p className="mb-5 text-xs uppercase tracking-[.4em] text-stone-600">Together with our families</p>
        <p className="mb-4 text-sm">{personalGreeting}</p>
        <h1 className="serif text-5xl leading-tight sm:text-7xl">{w.groom_name} <span className="italic text-[#a98767]">&</span> {w.bride_name}</h1>
        <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-stone-700 sm:text-base">Sẽ thật hạnh phúc khi có bạn ở bên trong ngày đặc biệt này.</p>
        <div className="mx-auto my-8 h-px w-20 bg-[#a98767]" />
        <p className="serif text-2xl">{dateText}</p><p className="mt-2 text-sm text-stone-600">Vào lúc {w.ceremony_time}</p>
        <a href="#details" className="mt-8 inline-flex rounded-full bg-[#29251f] px-7 py-3 text-sm text-white">Xem lời mời</a>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <p className="mb-4 text-xs uppercase tracking-[.35em] text-[#a98767]">Our story</p>
      <h2 className="serif text-4xl">Một hành trình, hai trái tim</h2>
      <p className="mx-auto mt-6 max-w-2xl leading-8 text-stone-600">{w.story}</p>
    </section>

    {w.gallery?.length>0 && <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="mb-8 text-center"><p className="text-xs uppercase tracking-[.35em] text-[#a98767]">Our moments</p><h2 className="serif mt-3 text-4xl">Album kỷ niệm</h2></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{w.gallery.map((src,i)=><a key={src+i} href={src} target="_blank" rel="noreferrer" className={`overflow-hidden rounded-2xl bg-stone-200 ${i===0?"col-span-2 aspect-[2/1] md:col-span-1 md:aspect-[3/4]":"aspect-[3/4]"}`}><img src={src} alt={`Ảnh kỷ niệm ${i+1}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" loading="lazy"/></a>)}</div>
    </section>}

    <section id="details" className="bg-[#f0e9df] px-6 py-20">
      <div className="mx-auto max-w-4xl text-center"><p className="mb-4 text-xs uppercase tracking-[.35em] text-[#a98767]">The celebration</p><h2 className="serif text-4xl">Thông tin buổi tiệc</h2>
        <div className="mx-auto mt-9 max-w-xl rounded-3xl bg-white/70 p-8 sm:p-12">
          <p className="text-xs uppercase tracking-[.25em] text-stone-500">Thời gian</p><p className="serif mt-3 text-2xl">{dateText}</p><p className="mt-2 text-stone-600">{w.ceremony_time}</p>
          <div className="mx-auto my-7 h-px w-14 bg-[#a98767]"/><p className="text-xs uppercase tracking-[.25em] text-stone-500">Địa điểm</p>
          <h3 className="serif mt-3 text-2xl">{w.venue_name}</h3><p className="mt-2 text-stone-600">{w.venue_address}</p>
          <a className="mt-6 inline-flex rounded-full border border-stone-300 px-6 py-3 text-sm hover:bg-white" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.venue_address)}`} target="_blank" rel="noreferrer">Mở bản đồ ↗</a>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="mb-8 text-center"><p className="text-xs uppercase tracking-[.35em] text-[#a98767]">Kindly reply</p><h2 className="serif mt-3 text-4xl">Xác nhận tham dự</h2><p className="mt-3 text-sm text-stone-600">Giúp chúng mình chuẩn bị chu đáo hơn nhé.</p></div>
      <form onSubmit={sendRsvp} className="mx-auto max-w-xl space-y-4 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <label className="block text-sm">Tên khách mời<input required value={rsvpName} onChange={e=>setRsvpName(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" placeholder={guest || "Tên của bạn"}/></label>
        <label className="block text-sm">Bạn sẽ tham dự chứ?<select value={attendance} onChange={e=>setAttendance(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"><option value="yes">Có, mình sẽ đến</option><option value="no">Rất tiếc, mình không thể tham dự</option></select></label>
        {attendance==="yes" && <label className="block text-sm">Số người tham dự<select value={guestCount} onChange={e=>setGuestCount(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3">{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} người</option>)}</select></label>}
        <label className="block text-sm">Ghi chú (không bắt buộc)<textarea value={rsvpNote} onChange={e=>setRsvpNote(e.target.value)} rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"/></label>
        <button className="w-full rounded-full bg-[#29251f] px-6 py-3 text-sm text-white">Gửi xác nhận</button>
      </form>
    </section>

    <section className="bg-[#f0e9df] px-6 py-20">
      <div className="mx-auto max-w-4xl text-center"><p className="text-xs uppercase tracking-[.35em] text-[#a98767]">A little blessing</p><h2 className="serif mt-3 text-4xl">Lời chúc dành cho chúng mình</h2>
        <form onSubmit={sendWish} className="mx-auto mt-8 max-w-xl space-y-4 rounded-3xl bg-white/80 p-6 text-left sm:p-8">
          <label className="block text-sm">Tên của bạn<input required value={wishName} onChange={e=>setWishName(e.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" placeholder="Tên khách mời"/></label>
          <label className="block text-sm">Lời chúc<textarea required value={wishText} onChange={e=>setWishText(e.target.value)} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" placeholder="Gửi đôi lời yêu thương..."/></label>
          <button className="w-full rounded-full bg-[#29251f] px-6 py-3 text-sm text-white">Gửi lời chúc</button>
        </form>
        {wishes.length>0 && <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">{wishes.map((item,i)=><article key={item.created_at+i} className="rounded-2xl bg-white/70 p-5 text-left"><p className="serif text-xl">{item.guest_name}</p><p className="mt-2 text-sm leading-6 text-stone-600">{item.message}</p></article>)}</div>}
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <p className="text-xs uppercase tracking-[.35em] text-[#a98767]">With love</p><h2 className="serif mt-3 text-4xl">Mừng cưới</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-stone-600">{w.gift_title}</p>
      {(w.gift_bank_name || w.gift_account_number || w.gift_qr_url) && <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-stone-200 bg-white p-7">
        {qrData && <img src={qrData} alt="Mã QR mừng cưới" className="mx-auto mb-5 h-48 w-48 object-contain" />}
        {w.gift_bank_name && <p className="text-sm text-stone-600">Ngân hàng: {w.gift_bank_name}</p>}
        {w.gift_account_name && <p className="mt-2 text-sm">Chủ tài khoản: {w.gift_account_name}</p>}
        {w.gift_account_number && <p className="mt-2 text-sm">Số tài khoản: {w.gift_account_number}</p>}
      </div>}
    </section>

    <footer className="px-6 py-12 text-center"><p className="serif text-3xl">{w.groom_name} & {w.bride_name}</p><p className="mt-3 text-xs tracking-[.2em] text-stone-500">CẢM ƠN BẠN ĐÃ LÀ MỘT PHẦN TRONG NGÀY ĐẶC BIỆT</p></footer>
    {message && <div role="status" className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl bg-[#29251f] px-5 py-4 text-sm text-white shadow-xl">{message}<button className="float-right ml-4 underline" onClick={()=>setMessage("")}>Đóng</button></div>}
  </main>;
}
