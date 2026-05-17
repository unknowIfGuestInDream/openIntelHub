import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/events/', label: 'Events' },
  { href: '/risk/', label: 'AI Risk' },
  { href: '/bias/', label: 'Media Bias' },
];

export function Nav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-brand-500">
          OpenIntelHub
        </Link>
        <ul className="flex gap-4 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-brand-500">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
