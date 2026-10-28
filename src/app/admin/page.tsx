 "use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { defaultWedding, type Wedding } from "@/lib/types";

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionEmail,setSessionEmail] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [w,setW] = useState<Wedding>(defaultWedding);
  const [status,setStatus] = useState("Đăng nhập bằng tài khoản Supabase Auth đã được cấp quyền quản trị.");
  const [loading,setLoading] = useState(false);

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>setSessionEmail(data.session?.user.email || ""));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session)=>setSessionEmail(session?.user.email || ""));
    return ()=>subscription.unsubscribe();
  },[supabase]);

  useEffect(()=>{
    if(!supabase || !sessionEmail) return;
    supabase.from("weddings").select("*").eq("slug",defaultWedding.slug).maybeSingle().then(({data,error})=>{
      if(data) setW(data as Wedding);
      if(error) setStatus("Không tải được dữ liệu. Kiểm tra policy admin trong schema.sql: "+error.message);
    });
  },[supabase,sessionEmail]);

  async function login(e:React.FormEvent) {
    e.preventDefault();
    if(!supabase){setStatus("Bạn cần cấu hình biến môi trường Supabase trước.");return;}
    setLoading(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    setStatus(error ? "Đăng nhập thất bại. Kiểm tra email, mật khẩu và tài khoản Supabase." : "Đăng nhập thành công.");
  }
  async function logout(){ if(supabase) await supabase.auth.signOut(); setStatus("Bạn đã đăng xuất."); }
  function update<K extends keyof Wedding>(key:K,value:Wedding[K]){setW(prev=>({...prev,[key]:value}));}
  const textField=(label:string,key:keyof Wedding,type="text")=><label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input type={type} value={String(w[key]??"")} onChange={e=>update(key,e.target.value as never)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"/></label>;

  async function uploadGallery(e:React.ChangeEvent<HTMLInputElement>){
    if(!supabase || !e.target.files?.length) return;
    const files=Array.from(e.target.files);
    setLoading(true);
    const urls:string[]=[];
    for(const file of files){
      if(!file.type.startsWith("image/") || file.size>8*1024*1024){setStatus("Chỉ chấp nhận ảnh dưới 8 MB.");continue;}
      const safeName=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
      const {error}=await supabase.storage.from("wedding-gallery").upload(safeName,file,{upsert:false,contentType:file.type});
      if(error){setStatus("Tải ảnh lỗi: "+error.message);continue;}
      const {data}=supabase.storage.from("wedding-gallery").getPublicUrl(safeName);
      urls.push(data.publicUrl);
    }
    if(urls.length) setW(prev=>({...prev,gallery:[...prev.gallery,...urls]}));
    setLoading(false);
    e.target.value="";
  }

  async function save(){
    if(!supabase){setStatus("Chưa cấu hình Supabase.");return;}
    setLoading(true);
    const {error}=await supabase.from("weddings").upsert({...w,slug:defaultWedding.slug},{onConflict:"slug"});
    setLoading(false);
    setStatus(error?"Lưu thất bại. Kiểm tra quyền quản trị/RLS: "+error.message:"Đã lưu nội dung thiệp.");
  }

  async function exportRsvps(){
    if(!supabase)return;
    const {data,error}=await supabase.from("rsvps").select("guest_name,attending,guest_count,note,created_at").eq("wedding_slug",defaultWedding.slug).order("created_at",{ascending:false});
    if(error||!data){setStatus("Không xuất được RSVP. Kiểm tra quyền quản trị.");return;}
    const csv=["Tên,Tham dự,Số người,Ghi chú,Thời gian",...data.map(r=>[r.guest_name,r.attending?"Có":"Không",r.guest_count,r.note,r.created_at].map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","))].join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download="rsvp-thiep-cuoi.csv";a.click();URL.revokeObjectURL(url);
  }

  if(!sessionEmail) return <main className="min-h-screen bg-[#f7f3ed] px-5 py-16"><section className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-8"><p className="text-xs uppercase tracking-[.3em] text-[#a98767]">Private admin</p><h1 className="serif mt-3 text-4xl">Quản trị thiệp cưới</h1><p className="mt-3 text-sm leading-6 text-stone-600">Đăng nhập bằng tài khoản đã tạo trong Supabase Auth và được cấp quyền quản trị trong SQL.</p><form onSubmit={login} className="mt-7 space-y-4"><label className="block text-sm">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"/></label><label className="block text-sm">Mật khẩu<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"/></label><button disabled={loading} className="w-full rounded-full bg-[#29251f] px-6 py-3 text-sm text-white">{loading?"Đang đăng nhập…":"Đăng nhập"}</button></form><p role="status" className="mt-4 text-sm text-stone-600">{status}</p><a href="/" className="mt-5 inline-block text-sm underline">← Về trang thiệp</a></section></main>;

  return <main className="min-h-screen bg-[#f7f3ed] px-4 py-10 sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.3em] text-[#a98767]">Wedding CMS</p><h1 className="serif mt-2 text-4xl">Quản trị thiệp cưới</h1><p className="mt-2 text-sm text-stone-600">Đăng nhập: {sessionEmail}</p></div><div className="flex gap-2"><a href="/" className="rounded-full border border-stone-300 px-4 py-3 text-sm">Xem thiệp ↗</a><button onClick={logout} className="rounded-full border border-stone-300 px-4 py-3 text-sm">Đăng xuất</button></div></header>
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"><h2 className="serif text-2xl">Nội dung thiệp</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("Tên chú rể","groom_name")}{textField("Tên cô dâu","bride_name")}{textField("Ngày giờ ISO 8601","wedding_date")}{textField("Giờ hiển thị","ceremony_time")}{textField("Tên địa điểm","venue_name")}{textField("Địa chỉ","venue_address")}{textField("URL ảnh bìa","hero_image")}{textField("URL nhạc nền (MP3)","music_url")}{textField("Màu nhấn HEX","accent_color")}{textField("Tên ngân hàng (mã VietQR)","gift_bank_name")}{textField("Tên chủ tài khoản","gift_account_name")}{textField("Số tài khoản","gift_account_number")}{textField("URL QR riêng (nếu có)","gift_qr_url")}
        </div>
        <label className="block text-sm">Lời mời / câu chuyện<textarea rows={4} value={w.story} onChange={e=>update("story",e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"/></label>
        <label className="block text-sm">Thông điệp mừng cưới<textarea rows={2} value={w.gift_title} onChange={e=>update("gift_title",e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3"/></label>
        <div><label className="block text-sm font-medium">Tải ảnh album (tối đa 8 MB mỗi ảnh)</label><input type="file" accept="image/*" multiple onChange={uploadGallery} className="mt-3 block w-full text-sm"/></div>
        {w.gallery.length>0 && <div className="grid grid-cols-3 gap-3">{w.gallery.map((url,i)=><div key={url+i} className="relative"><img src={url} alt={`Ảnh ${i+1}`} className="aspect-square w-full rounded-xl object-cover"/><button onClick={()=>update("gallery",w.gallery.filter((_,j)=>j!==i))} className="mt-1 text-xs underline">Gỡ khỏi album</button></div>)}</div>}
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={w.published} onChange={e=>update("published",e.target.checked)}/> Công khai thiệp</label>
        <div className="flex flex-wrap gap-3"><button onClick={save} disabled={loading} className="rounded-full bg-[#29251f] px-7 py-3 text-sm text-white">{loading?"Đang xử lý…":"Lưu thay đổi"}</button><button onClick={exportRsvps} className="rounded-full border border-stone-300 px-6 py-3 text-sm">Xuất danh sách RSVP CSV</button></div>
        <p role="status" className="text-sm text-stone-600">{status}</p>
      </section>
      <aside className="h-fit rounded-3xl bg-[#e8dfd2] p-6"><p className="text-xs uppercase tracking-[.25em] text-stone-600">Xem trước</p><h2 className="serif mt-4 text-3xl">{w.groom_name} & {w.bride_name}</h2><p className="mt-4 text-sm">{w.wedding_date}</p><p className="mt-2 text-sm">{w.venue_name}</p><p className="mt-1 text-sm text-stone-600">{w.venue_address}</p><div className="mt-5 h-1 rounded" style={{backgroundColor:w.accent_color}}/><p className="mt-5 text-xs leading-6 text-stone-600">Link cá nhân hóa: thêm `?guest=Ten-Khach` vào URL trang thiệp. Khi có tên miền thật, dùng link dạng `https://tenmiencuaban.vn/?guest=Em%20Linh`.</p></aside>
    </div>
  </div></main>;
}
