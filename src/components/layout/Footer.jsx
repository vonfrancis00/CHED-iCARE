export default function Footer() {
  return (
    <footer className="border-t border-[#203656] bg-[#091c3e] text-[#c9d6e8]">
      <div className="mx-auto flex max-w-[1600px] justify-center px-6 py-6 sm:px-10 lg:px-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4" aria-label="Partner organizations">
          <img
            src="/ched-logo.png"
            alt="Commission on Higher Education"
            className="h-24 w-auto object-contain"
          />
          <img
            src="/BAGONG-PILIPINAS.png"
            alt="Bagong Pilipinas"
            className="h-24 w-auto object-contain"
          />
          </div>

          <p className="text-center text-sm font-medium leading-6 tracking-[0.01em] text-[#b9cbe2]">
          <span className="mb-1 block font-['Plus_Jakarta_Sans'] text-base font-bold tracking-[0.01em] text-[#f4f8ff]">Childcare Development Dashboard</span>
          Copyright &copy; Commission on Higher Education<br className="hidden sm:block" />
          <span className="sm:hidden"> · </span>
          All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
