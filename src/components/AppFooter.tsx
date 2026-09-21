// Footer shared by every page: full-width white band with the organisation name. `mt-auto` pins it
// to the bottom of the viewport when the page is short (the parent is a min-h-screen flex column).
// `clearBottomNav`: the admin's fixed mobile bottom bar (BottomNav) would cover the text, so leave room.
export function AppFooter({ clearBottomNav = false }: { clearBottomNav?: boolean }) {
  return (
    <footer
      className={`mt-auto border-t border-slate-200 bg-white px-5 pt-10 text-center ${
        clearBottomNav ? "pb-24 md:pb-10" : "pb-10"
      }`}
    >
      <p className="text-base font-bold text-slate-500">ศูนย์เทคโนโลยีดิจิทัล หน่วยราชการในพระองค์</p>
      <p className="mt-1.5 text-sm text-slate-300">© Digital Hygiene &amp; Safety First</p>
    </footer>
  );
}
