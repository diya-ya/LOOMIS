import { Link } from 'react-router-dom';

const steps = [
  {
    num: '01',
    title: 'Upload your reference',
    body: 'Bring in a portrait photograph and set your physical canvas dimensions in centimetres or inches.',
  },
  {
    num: '02',
    title: 'Generate Loomis guides',
    body: 'Facial landmarks are detected locally, then structural divisions, cranial sphere, and feature lines are constructed.',
  },
  {
    num: '03',
    title: 'Transfer measurements',
    body: 'Read precise physical distances, refine landmarks by hand, and export a print-ready drawing guide.',
  },
];

const features = [
  {
    title: 'Intelligent landmark detection',
    body: 'MediaPipe Face Landmarker runs in your browser to map eyes, brows, nose, mouth, and facial boundary.',
  },
  {
    title: 'Loomis structural construction',
    body: 'Cranial sphere, side plane, centerline, primary thirds, and eye-width subdivisions — orientation-aware.',
  },
  {
    title: 'Physical canvas measurements',
    body: 'Distances are computed in real canvas units, not screen pixels, so print scale stays honest.',
  },
  {
    title: 'Interactive landmark editing',
    body: 'Drag any point to correct detection. Dependent geometry and measurements update immediately.',
  },
  {
    title: 'Print-ready drawing guides',
    body: 'Export high-resolution PNG or a PDF sized to your exact canvas for 100% scale printing.',
  },
];

export function FeatureSection() {
  return (
    <>
      <section
        id="how-it-works"
        className="border-t border-[var(--color-border)] px-6 py-24 md:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-medium tracking-[0.28em] text-[var(--color-accent)]">
            PROCESS
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[var(--color-text)] md:text-4xl">
            How it works
          </h2>
          <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map((step) => (
              <div key={step.num}>
                <span className="font-serif text-4xl text-[var(--color-structural)]/40">
                  {step.num}
                </span>
                <h3 className="mt-4 text-sm font-semibold tracking-wide text-[var(--color-text)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-medium tracking-[0.28em] text-[var(--color-accent)]">
            CAPABILITIES
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[var(--color-text)] md:text-4xl">
            Built for the drawing studio
          </h2>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="border-t border-[var(--color-border)] pt-5">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-6 py-28 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl text-[var(--color-text)] text-balance md:text-5xl">
            Start with structure. Finish with confidence.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm text-[var(--color-text-secondary)]">
            Your portraits stay on your device. Detection, construction, and
            export all run locally in the browser.
          </p>
          <Link
            to="/studio"
            className="mt-10 inline-flex items-center bg-[var(--color-accent)] px-8 py-3.5 text-xs font-semibold tracking-[0.2em] text-[#1a1410] transition-opacity hover:opacity-90"
          >
            OPEN LOOMIS STUDIO
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-6 py-8 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 text-xs text-[var(--color-text-secondary)] md:flex-row md:items-center">
          <span className="font-serif tracking-[0.2em] text-[var(--color-text)]">LOOMIS</span>
          <span>Local-first portrait construction. No account required.</span>
        </div>
      </footer>
    </>
  );
}
