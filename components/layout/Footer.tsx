export default function Footer() {
  return (
    <footer className="bg-[#0E0E0E] py-8 px-9 flex flex-col md:flex-row items-center justify-between border-t border-white/10">
      <div className="flex items-center gap-1 mb-4 md:mb-0">
        <span className="text-white font-barlow font-bold text-xl uppercase tracking-wider">ComicLife</span>
        <div className="w-1.5 h-1.5 rounded-full bg-yellow" />
      </div>
      
      <div className="flex items-center gap-6 text-white/50 font-mono text-[10px] uppercase tracking-[.08em]">
        <a href="#" className="hover:text-white transition">Terms</a>
        <a href="#" className="hover:text-white transition">Privacy</a>
        <a href="#" className="hover:text-white transition">Contact</a>
      </div>

      <div className="text-white/30 font-mono text-[10px] mt-4 md:mt-0">
        © {new Date().getFullYear()} COMICLIFE. ALL RIGHTS RESERVED.
      </div>
    </footer>
  )
}
