import { Link } from 'react-router-dom';
import { WireframeHead } from './WireframeHead';

export function Hero() {
  return (
    <header className="relative min-h-screen overflow-hidden">
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <Link to="/" className="font-serif text-2xl tracking-[0.2em] text-[var(--color-text)]">
          LOOMIS
        </Link>
        <Link
          to="/studio"
          className="text-xs font-medium tracking-[0.18em] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
        >
          STUDIO
        </Link>
      </nav>

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 pb-16 pt-24 md:grid-cols-2 md:gap-4 md:px-12 md:pt-20">
        <div className="relative z-10 max-w-xl">
          <p className="mb-6 text-[11px] font-medium tracking-[0.28em] text-[var(--color-accent)]">
            PORTRAIT CONSTRUCTION
          </p>
          <h1 className="font-serif text-4xl leading-[1.1] text-[var(--color-text)] text-balance md:text-5xl lg:text-6xl">
            Every portrait begins with structure.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            LOOMIS analyzes a photographic reference, fits it to your physical
            canvas, and generates measured Loomis-style construction guides —
            so you can transfer proportion with confidence.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/studio"
              className="inline-flex items-center bg-[var(--color-accent)] px-7 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#1a1410] transition-opacity hover:opacity-90"
            >
              START CONSTRUCTING
            </Link>
            <a
              href="#how-it-works"
              className="text-xs tracking-[0.16em] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
            >
              HOW IT WORKS
            </a>
          </div>
        </div>

        <div className="relative h-[420px] md:h-[560px] lg:h-[640px]">
          <WireframeHead />
        </div>
      </div>
    </header>
  );
}
