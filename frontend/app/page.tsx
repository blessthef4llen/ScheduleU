"use client";
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <header className="flex justify-between items-center px-8 py-4 border-b">
        <div className="flex items-center gap-1">
          <Link href="/" className="text-3xl font-bold text-slate-700 tracking-tight hover:opacity-80">
            Schedule<span className="text-schu-teal">U</span>
          </Link>
          <div className="w-6 h-6 border-2 border-schu-teal grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-schu-teal"></div>
            <div className="bg-schu-teal"></div>
            <div className="bg-schu-teal"></div>
            <div className="bg-schu-teal"></div>
          </div>
        </div>

        <nav className="flex items-center gap-8">
          <Link href="/about" className="text-sm font-medium hover:text-schu-teal transition-colors">About us</Link>
          <Link href="/dashboard" className="text-sm font-medium hover:text-schu-teal transition-colors">Get Started</Link>
          <Link href="/login" className="schu-gradient text-white px-5 py-2 rounded-md text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
            Login/Sign-up &gt;
          </Link>
          <div className="flex flex-col gap-1 cursor-pointer">
            <div className="w-6 h-1 bg-schu-blue"></div>
            <div className="w-6 h-1 bg-schu-blue"></div>
            <div className="w-6 h-1 bg-schu-blue"></div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-12 py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-left">
          <h2 className="text-6xl font-black text-slate-700 leading-tight uppercase">
            Plan Smarter, <br /> Schedule Easier
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
            Welcome to ScheduleU, your all-in-one scheduling and planning platform designed
            exclusively for CSU Long Beach students.
          </p>
          <Link href="/login" className="inline-block schu-gradient text-white font-bold py-4 px-8 rounded-lg shadow-md hover:scale-105 transition-transform uppercase text-sm tracking-widest">
            Create your own schedule now!
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
          {/* Fixed the src path to match your file in the public folder */}
          <img
            src="/hero-image.png" 
            alt="ScheduleU Graphic"
            className="w-full max-w-xl h-auto drop-shadow-xl transition-all duration-500"
            onError={(e) => {
              console.error("Image failed to load. Check public/hero-image.png exists.");
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </main>
    </div>
  );
}