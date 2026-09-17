export default function Footer() {
  return (
    <footer className="border-t border-blue-300/10 bg-[#061a3a] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:gap-7 lg:px-12">
        <div className="flex items-center gap-4" aria-label="Partner organizations">
          <img
            src="/ched-logo.png"
            alt="Commission on Higher Education"
            className="h-14 w-auto object-contain"
          />
          <img
            src="/BAGONG-PILIPINAS.png"
            alt="Bagong Pilipinas"
            className="h-14 w-auto object-contain"
          />
        </div>

        <div className="hidden h-11 w-px bg-white/20 lg:block" aria-hidden="true" />

        <p className="text-sm font-medium leading-5 text-slate-100">
          <span className="block font-semibold text-white">Childcare Development Dashboard</span>
          Copyright &copy; Commission on Higher Education<br className="hidden sm:block" />
          <span className="sm:hidden"> · </span>
          All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
