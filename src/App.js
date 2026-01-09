import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, Clock, Calendar, CheckCircle, XCircle, Shield, Camera, Navigation, Phone, User, Play, Image, Ruler, Activity, Settings, BarChart } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Function: Calculate Distance (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return (R * c).toFixed(2);
}

// Component: Map Marker Picker
function LocationMarker({ setPos, pos }) {
  useMapEvents({ click(e) { setPos(e.latlng); } });
  return pos ? <Marker position={pos} /> : null;
}

export default function App() {
  // Roles & Data
  const [role, setRole] = useState('sales');
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  
  // Sales State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [zone, setZone] = useState('A');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [mapPos, setMapPos] = useState({ lat: 17.966, lng: 102.613 });
  const [msg, setMsg] = useState(null);
  
  // Admin State
  const [adminDate, setAdminDate] = useState(new Date().toISOString().slice(0, 10));
  const [adminZone, setAdminZone] = useState('A');
  const [adminSlots, setAdminSlots] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [adminMapPreview, setAdminMapPreview] = useState(null);

  // Tech State
  const [techTab, setTechTab] = useState('todo');
  const [selectedJob, setSelectedJob] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);

  // Initial Fetch
  useEffect(() => {
    if (role === 'sales') fetchSlots(date, zone, setSlots);
    if (role === 'admin') {
        fetchBookings();
        fetchSlots(adminDate, adminZone, setAdminSlots);
        fetchForecast();
    }
    if (role === 'tech') fetchBookings();
    
    // Auto-refresh bookings for status monitoring
    const interval = setInterval(() => {
        if(role === 'sales' || role === 'admin') fetchBookings();
    }, 10000); 
    return () => clearInterval(interval);

  }, [date, zone, role, adminDate, adminZone]);

  // API Handlers
  const fetchSlots = async (d, z, setter) => {
    const res = await axios.get(`http://localhost/wh_api/api.php?action=get_slots&date=${d}&zone=${z}`);
    setter(res.data);
    setSelectedSlot(null);
  };

  const fetchBookings = async () => {
    const res = await axios.get('http://localhost/wh_api/api.php');
    setBookings(res.data);
  };

  const fetchForecast = async () => {
    const res = await axios.get('http://localhost/wh_api/api.php?action=get_forecast');
    setForecast(res.data);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    const type = selectedSlot.is_full ? 'insert' : 'normal';
    const payload = { ...form, zone, date, time_slot: selectedSlot.time, type, lat: mapPos.lat, lng: mapPos.lng };
    try {
      const res = await axios.post('http://localhost/wh_api/api.php', payload);
      setMsg(res.data); fetchSlots(date, zone, setSlots); setForm({ name: '', phone: '' }); setSelectedSlot(null);
      setTimeout(() => setMsg(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleUpdateSlotLimit = async (slotTime, newLimit) => {
    const formData = new FormData();
    formData.append('action', 'update_slot');
    formData.append('zone', adminZone);
    formData.append('time_slot', slotTime);
    formData.append('max_limit', newLimit);
    await axios.post('http://localhost/wh_api/api.php', formData);
    fetchSlots(adminDate, adminZone, setAdminSlots);
  };

  const handleAdminAction = async (id, action) => {
    await axios.put('http://localhost/wh_api/api.php', { id, action });
    fetchBookings(); setAdminMapPreview(null);
  };

  const handleTechAccept = async (id) => {
    const formData = new FormData();
    formData.append('action', 'accept_job');
    formData.append('id', id);
    await axios.post('http://localhost/wh_api/api.php', formData);
    fetchBookings();
  };

  const handleTechSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('action', 'complete_job');
    formData.append('id', selectedJob.id);
    formData.append('photo', photo);
    await axios.post('http://localhost/wh_api/api.php', formData);
    setSelectedJob(null); setPhoto(null); fetchBookings();
    alert("ສົ່ງວຽກສຳເລັດ!");
  };

  const getNearestDistance = (pendingBooking) => {
    const confirmedInZone = bookings.filter(b => b.status === 'confirmed' && b.zone === pendingBooking.zone && b.booking_date === pendingBooking.booking_date);
    if (confirmedInZone.length === 0) return null;
    let minKm = Infinity; let nearestJob = null;
    confirmedInZone.forEach(job => {
      const km = parseFloat(calculateDistance(pendingBooking.lat, pendingBooking.lng, job.lat, job.lng));
      if (km < minKm) { minKm = km; nearestJob = job; }
    });
    return { km: minKm, job: nearestJob };
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-800">
      
      {/* Menu Switcher */}
      <div className="max-w-md mx-auto bg-white p-2 rounded-xl shadow mb-6 flex justify-center gap-2 overflow-x-auto">
        {['sales', 'admin', 'tech'].map(r => (
          <button key={r} onClick={() => setRole(r)} className={`px-4 py-2 rounded-lg font-bold capitalize ${role === r ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>{r}</button>
        ))}
      </div>

      {/* --- SALES VIEW --- */}
      {role === 'sales' && (
        <div className="max-w-md mx-auto space-y-4">
          
          {/* Zone & Date Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg flex items-center gap-2"><MapPin className="text-blue-600"/> ເລືອກ Zone & Date</h2>
                <input type="date" className="border p-2 rounded-lg bg-slate-50 font-bold" value={date} onChange={e=>setDate(e.target.value)} />
             </div>
             <div className="grid grid-cols-5 gap-2 mt-1">
                {['A', 'B', 'C', 'D', 'E'].map(z => (
                  <button key={z} onClick={() => setZone(z)} className={`py-2 rounded-lg font-bold border ${zone === z ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50'}`}>{z}</button>
                ))}
             </div>
          </div>

          {/* Slot List (Time & Quantity) */}
          <div className="space-y-3">
            {slots.map((slot, index) => {
              const available = slot.limit - slot.booked;
              const displayAvailable = available < 0 ? 0 : available;
              
              return (
                <div key={index} onClick={() => setSelectedSlot(slot)} className={`p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center bg-white shadow-sm ${selectedSlot?.time === slot.time ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white'}`}>
                  <div>
                    <div className="font-black text-lg">{slot.time}</div>
                    <div className={`text-sm font-bold ${slot.is_full ? 'text-red-500' : 'text-green-600'}`}>
                      {slot.is_full ? "❌ ເຕັມແລ້ວ" : `✅ ຫວ່າງ (${displayAvailable}/${slot.limit})`}
                    </div>
                  </div>
                  {slot.is_full 
                    ? <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">ເຕັມ</span> 
                    : <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">ຈອງໄດ້</span>
                  }
                </div>
              );
            })}
          </div>

          {/* Tech Status Monitor (Sales View) */}
          <div className="bg-white p-4 rounded-2xl shadow mt-6 border border-blue-100">
             <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-800"><Activity size={18}/> ຕິດຕາມສະຖານະຊ່າງ (Tech Status)</h3>
             <div className="space-y-3 max-h-60 overflow-y-auto">
               {bookings.filter(b => b.booking_date === date).map(b => (
                 <div key={b.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-bold text-sm">{b.customer_name} <span className="text-xs text-slate-400">({b.zone})</span></div>
                      <div className="text-xs">
                        {b.tech_status === 'waiting' && <span className="text-slate-400 font-medium">🕒 ລໍຖ້າຊ່າງຮັບງານ</span>}
                        {b.tech_status === 'accepted' && <span className="text-blue-600 font-bold animate-pulse">🚚 ກຳລັງດຳເນີນການ</span>}
                        {b.tech_status === 'completed' && <span className="text-green-600 font-bold">✅ ຕິດຕັ້ງແລ້ວ</span>}
                      </div>
                    </div>
                    {b.photo_proof && <button onClick={()=>setViewPhoto(b.photo_proof)} className="text-xs bg-slate-800 text-white px-2 py-1 rounded flex gap-1"><Image size={12}/> ຮູບ</button>}
                 </div>
               ))}
               {bookings.filter(b => b.booking_date === date).length === 0 && <p className="text-xs text-slate-400 text-center py-4">ຍັງບໍ່ມີວຽກໃນວັນນີ້</p>}
             </div>
          </div>

          {/* Booking Modal */}
          <AnimatePresence>
            {selectedSlot && (
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-50 max-w-md mx-auto border-t">
                <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">{selectedSlot.is_full ? 'ຂໍແຊກຄິວ' : 'ຈອງຄິວ'} <span className="text-blue-600">{selectedSlot.time}</span></h3><button onClick={() => setSelectedSlot(null)} className="p-2 bg-slate-100 rounded-full"><XCircle size={20}/></button></div>
                <form onSubmit={handleBooking} className="space-y-4">
                  <input type="text" placeholder="ຊື່ລູກຄ້າ" required className="w-full bg-slate-50 p-3 rounded-xl" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                  <input type="text" placeholder="ເບີໂທ" required className="w-full bg-slate-50 p-3 rounded-xl" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
                  <div className="h-32 rounded-xl overflow-hidden border"><MapContainer center={mapPos} zoom={13} style={{ height: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationMarker pos={mapPos} setPos={setMapPos} /></MapContainer></div>
                  <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${selectedSlot.is_full ? 'bg-amber-500' : 'bg-blue-600'}`}>{selectedSlot.is_full ? 'ຢືນຢັນການແຊກຄິວ' : 'ຢືນຢັນການຈອງ'}</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Success/Error Message */}
          <AnimatePresence>
            {msg && (
              <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className={`fixed top-4 left-4 right-4 p-4 rounded-xl text-center font-bold text-white shadow-lg z-[200] ${msg.status==='success'?'bg-green-500':'bg-amber-500'}`}>
                {msg.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --- ADMIN VIEW --- */}
      {role === 'admin' && (
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Approvals */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow h-fit">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="text-red-600"/> Admin Approval</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 uppercase text-xs"><tr><th className="p-3">Info</th><th className="p-3">Distance</th><th className="p-3">Action</th></tr></thead>
                  <tbody>
                    {bookings.filter(b => b.status === 'pending_approval').map(b => {
                      const nearest = getNearestDistance(b);
                      return (
                        <tr key={b.id} className="border-b bg-red-50/50">
                           <td className="p-3">
                             <div className="font-bold">{b.customer_name}</div>
                             <div className="text-xs text-slate-500">{b.booking_type==='insert' && <span className="text-amber-600 font-bold">[ແຊກຄິວ] </span>}{b.booking_date} | Zone {b.zone} | {b.time_slot}</div>
                           </td>
                           <td className="p-3">{nearest ? (<div><div className="text-sm font-bold text-slate-700 flex items-center gap-1"><Ruler size={14}/> {nearest.km} km</div><div className="text-xs text-slate-500">ຈາກ: {nearest.job.customer_name}</div><button onClick={()=>setAdminMapPreview({pending: b, current: nearest.job})} className="text-xs text-blue-600 underline mt-1">ເບິ່ງແຜນທີ່</button></div>) : <span className="text-xs text-slate-400">ເປັນຄິວທຳອິດ</span>}</td>
                           <td className="p-3 space-x-2"><button onClick={()=>handleAdminAction(b.id,'approve')} className="bg-green-500 text-white px-2 py-1 rounded">✓</button><button onClick={()=>handleAdminAction(b.id,'reject')} className="bg-red-500 text-white px-2 py-1 rounded">✕</button></td>
                        </tr>
                    )})}
                    {bookings.filter(b => b.status === 'pending_approval').length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-400">ບໍ່ມີລາຍການລໍຖ້າ</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Slot Manager & Tech Monitor */}
            <div className="space-y-6">
               
               {/* 1. Slot Manager */}
               <div className="bg-white p-6 rounded-2xl shadow border border-blue-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700"><Settings size={20}/> ຈັດການ Slot (Manager)</h2>
                  <div className="space-y-2 mb-4">
                     <div className="flex justify-between items-center gap-2">
                        <input type="date" className="border p-2 rounded w-full font-bold" value={adminDate} onChange={e=>setAdminDate(e.target.value)}/>
                        <select className="border p-2 rounded font-bold" value={adminZone} onChange={e=>setAdminZone(e.target.value)}>
                           {['A','B','C','D','E'].map(z=><option key={z} value={z}>Zone {z}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                     {adminSlots.map((slot, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                           <span className="font-bold text-sm text-slate-600">{slot.time}</span>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">ຈອງ: {slot.booked}</span>
                              <input type="number" className="w-12 p-1 border rounded text-center font-bold text-blue-600" 
                                 defaultValue={slot.limit} 
                                 onBlur={(e)=>handleUpdateSlotLimit(slot.time, e.target.value)} 
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* 2. Tech Monitor (Admin) */}
               <div className="bg-white p-6 rounded-2xl shadow h-fit">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="text-green-600"/> ຕິດຕາມຊ່າງ</h2>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                     {bookings.filter(b => b.status === 'confirmed').map(b => (
                        <div key={b.id} className="border rounded-xl p-3 hover:shadow-md transition-shadow bg-slate-50">
                           <div className="flex justify-between items-start">
                              <span className="font-bold text-sm text-slate-700">{b.customer_name}</span>
                              <span className="text-xs font-black bg-white border px-1 rounded">Z-{b.zone}</span>
                           </div>
                           <div className="mt-1 text-xs">
                             {b.tech_status === 'waiting' && <span className="text-slate-400">🕒 ລໍຖ້າຮັບງານ</span>}
                             {b.tech_status === 'accepted' && <span className="text-blue-600 font-bold animate-pulse">🚚 ກຳລັງດຳເນີນການ</span>}
                             {b.tech_status === 'completed' && <span className="text-green-600 font-bold">✅ ສຳເລັດ</span>}
                           </div>
                           {b.photo_proof && <button onClick={()=>setViewPhoto(b.photo_proof)} className="w-full mt-2 text-xs bg-slate-800 text-white py-1 rounded flex justify-center items-center gap-1 hover:bg-slate-700"><Image size={12}/> ເບິ່ງຮູບງານ</button>}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          {/* Bottom: 7-Day Forecast */}
          <div className="bg-white p-6 rounded-2xl shadow">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BarChart className="text-indigo-600"/> 7 ວັນຂ້າງໜ້າ (Forecast)</h2>
             <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                   <thead>
                      <tr className="bg-indigo-50 text-indigo-900">
                         <th className="p-3 rounded-tl-xl text-left">ວັນທີ</th>
                         <th className="p-3">Zone A</th>
                         <th className="p-3">Zone B</th>
                         <th className="p-3">Zone C</th>
                         <th className="p-3">Zone D</th>
                         <th className="p-3">Zone E</th>
                         <th className="p-3 rounded-tr-xl font-black bg-indigo-100">ລວມ</th>
                      </tr>
                   </thead>
                   <tbody>
                      {forecast.map((day, idx) => (
                         <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-left font-bold text-slate-600">{day.date}</td>
                            {['A','B','C','D','E'].map(z => (
                               <td key={z} className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${day.zones[z] > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-300'}`}>
                                     {day.zones[z]}
                                  </span>
                               </td>
                            ))}
                            <td className="p-3 font-black text-indigo-700 bg-indigo-50">{day.total}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* --- TECH VIEW --- */}
      {role === 'tech' && (
        <div className="max-w-md mx-auto">
          <div className="flex bg-white p-1 rounded-xl shadow mb-4">
             <button onClick={()=>setTechTab('todo')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${techTab==='todo'?'bg-blue-600 text-white':'text-slate-500'}`}>ວຽກຕ້ອງເຮັດ</button>
             <button onClick={()=>setTechTab('done')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${techTab==='done'?'bg-green-600 text-white':'text-slate-500'}`}>ສຳເລັດແລ້ວ</button>
          </div>
          <div className="space-y-4">
            {bookings.filter(b => b.status === 'confirmed' && (techTab === 'todo' ? b.tech_status !== 'completed' : b.tech_status === 'completed')).map(b => (
              <div key={b.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-start mb-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{b.time_slot}</span><span className="font-black text-slate-300 text-xl">Zone {b.zone}</span></div>
                 {b.tech_status === 'waiting' && techTab === 'todo' && <div className="text-center py-4"><h3 className="text-lg font-bold text-slate-800 mb-2">ມີງານໃໝ່ເຂົ້າມາ!</h3><button onClick={()=>handleTechAccept(b.id)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto animate-pulse"><Play size={18}/> ກົດຮັບງານ</button></div>}
                 {b.tech_status === 'accepted' && techTab === 'todo' && <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User size={18}/> {b.customer_name}</h3><div className="text-sm text-slate-500 mt-1 flex items-center gap-2"><Phone size={14}/> {b.phone}</div><div className="grid grid-cols-2 gap-3 mt-4"><a href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-sm flex justify-center items-center gap-2"><Navigation size={16}/> ນຳທາງ</a><button onClick={()=>setSelectedJob(b)} className="bg-green-600 text-white py-2 rounded-xl font-bold text-sm flex justify-center items-center gap-2"><Camera size={16}/> ສົ່ງວຽກ</button></div></div>}
                 {techTab === 'done' && <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User size={18}/> {b.customer_name}</h3>{b.photo_proof && <div className="mt-3"><img src={`http://localhost/wh_api/uploads/${b.photo_proof}`} className="w-full h-32 object-cover rounded-lg border" onClick={()=>setViewPhoto(b.photo_proof)}/></div>}</div>}
              </div>
            ))}
            {bookings.filter(b => b.status === 'confirmed' && (techTab === 'todo' ? b.tech_status !== 'completed' : b.tech_status === 'completed')).length === 0 && <div className="text-center py-10 text-slate-400">ບໍ່ມີລາຍການ</div>}
          </div>
          <AnimatePresence>{selectedJob && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="font-bold text-lg mb-4">ສົ່ງວຽກ: {selectedJob.customer_name}</h3><form onSubmit={handleTechSubmit} className="space-y-4"><input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} required className="w-full" /><div className="flex gap-2"><button type="button" onClick={()=>setSelectedJob(null)} className="flex-1 py-2 bg-slate-100 rounded-xl">ຍົກເລີກ</button><button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-xl">ຢືນຢັນ</button></div></form></div></motion.div>}</AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {viewPhoto && <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4" onClick={()=>setViewPhoto(null)}><img src={`http://localhost/wh_api/uploads/${viewPhoto}`} className="max-w-full max-h-full rounded shadow-2xl"/></div>}
      {adminMapPreview && <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4"><div className="bg-white p-4 rounded-xl w-full max-w-2xl h-[500px] flex flex-col"><div className="flex justify-between mb-2"><h3 className="font-bold">ທຽບໄລຍະທາງ</h3><button onClick={()=>setAdminMapPreview(null)}><XCircle/></button></div><div className="flex-1 border rounded overflow-hidden"><MapContainer center={[adminMapPreview.pending.lat, adminMapPreview.pending.lng]} zoom={13} style={{ height: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[adminMapPreview.pending.lat, adminMapPreview.pending.lng]}><Popup>ລູກຄ້າໃໝ່</Popup></Marker><Marker position={[adminMapPreview.current.lat, adminMapPreview.current.lng]}><Popup>ວຽກເດີມ: {adminMapPreview.current.customer_name}</Popup></Marker></MapContainer></div><div className="mt-2 text-center font-bold text-blue-600">ໄລຍະຫ່າງ: {calculateDistance(adminMapPreview.pending.lat, adminMapPreview.pending.lng, adminMapPreview.current.lat, adminMapPreview.current.lng)} km</div></div></div>}
    </div>
  );
}