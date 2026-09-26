import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const priceSummary = vi.fn();

vi.mock('../../../lib/api', () => ({
  api: {
    priceSummary: () => priceSummary(),
  },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, role: null }),
}));

const { I18nProvider } = await import('../../../contexts/I18nContext');
const { LandingPage } = await import('../LandingPage');

function renderLanding() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <LandingPage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  priceSummary.mockReset();
  priceSummary.mockResolvedValue([
    { cropName: 'Onion', avgPrice: 1200, minPrice: 1100, maxPrice: 1300, listings: 4, unit: 'kg' },
    { cropName: 'Tomato', avgPrice: 40, minPrice: 30, maxPrice: 50, listings: 9, unit: 'kg' },
  ]);
});

describe('LandingPage hero stats', () => {
  it('labels each stat once, with no repeated prefix', () => {
    renderLanding();
    expect(screen.getByText('Farmers')).toBeInTheDocument();
    expect(screen.getByText('Crops')).toBeInTheDocument();
    expect(screen.getByText('Trade volume')).toBeInTheDocument();
    // The old markup rendered "farmers · farmers" on every stat.
    expect(screen.queryByText(/farmers\s*·\s*farmers/i)).toBeNull();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('keeps the stat figures next to their labels', () => {
    renderLanding();
    for (const value of ['10k+', '120+', '₹4Cr+']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });
});

describe("LandingPage today's advisory", () => {
  it('shows all three advisories', () => {
    renderLanding();
    expect(screen.getByText('Sorghum — ideal for this season')).toBeInTheDocument();
    expect(screen.getByText('Neem oil to control aphids')).toBeInTheDocument();
    expect(screen.getByText('Onion prices are up 12% at the mandi')).toBeInTheDocument();
  });

  it('does not leave the advisory text hardcoded in English', () => {
    const { container } = renderLanding();
    // Advisory body copy must come from the dictionary, not a literal.
    expect(container.innerHTML).not.toContain('Onion up 12% at mandi');
    expect(container.innerHTML).not.toContain('Sorghum — ideal this season');
  });

  it('quotes the APMC price with a translated unit', () => {
    renderLanding();
    expect(screen.getByText('Onion price at APMC')).toBeInTheDocument();
    expect(screen.getByText('per quintal')).toBeInTheDocument();
  });
});

describe('LandingPage mandi ticker', () => {
  it('lists a crop only once even when the API casing differs', async () => {
    priceSummary.mockResolvedValue([
      { cropName: 'Onion', avgPrice: 1200, minPrice: 1100, maxPrice: 1300, listings: 4, unit: 'kg' },
      { cropName: 'onion ', avgPrice: 1500, minPrice: 1400, maxPrice: 1600, listings: 2, unit: 'kg' },
      { cropName: 'Tomato', avgPrice: 40, minPrice: 30, maxPrice: 50, listings: 9, unit: 'kg' },
    ]);
    const { container } = renderLanding();

    await vi.waitFor(() => expect(screen.getAllByText('Live Mandi Prices').length).toBeGreaterThan(0));

    // Two copies exist for the seamless loop, so each crop appears exactly twice.
    expect(screen.getAllByText('Onion')).toHaveLength(2);
    expect(screen.queryByText('onion')).toBeNull();
    expect(container.innerHTML).not.toContain('1500');
  });

  it('pairs every price with a percentage change', async () => {
    const { container } = renderLanding();
    await vi.waitFor(() => expect(container.innerHTML).toMatch(/[▲▼]/));
    const arrows = container.innerHTML.match(/[▲▼]/) ?? [];
    expect(arrows.length).toBeGreaterThan(0);
    expect(container.innerHTML).toMatch(/[▲▼] [\d.]+%/);
  });

  it('hides the ticker when there are no prices', () => {
    priceSummary.mockResolvedValue([]);
    renderLanding();
    expect(screen.queryByText('Live Mandi Prices')).toBeNull();
  });
});

describe('LandingPage translation', () => {
  const cases = [
    { lang: 'hi', stats: ['किसान', 'फ़सलें', 'व्यापार'], advisory: 'आज की सलाह' },
    { lang: 'mr', stats: ['शेतकरी', 'पिके', 'व्यापार'], advisory: 'आजचा सल्ला' },
  ] as const;

  for (const { lang, stats, advisory } of cases) {
    it(`translates the hero stats into ${lang}`, () => {
      localStorage.setItem('km_lang', lang);
      try {
        renderLanding();
        for (const label of stats) {
          expect(screen.getByText(label)).toBeInTheDocument();
        }
        // English labels must be gone.
        expect(screen.queryByText('Farmers')).toBeNull();
        expect(screen.queryByText('Trade volume')).toBeNull();
      } finally {
        localStorage.removeItem('km_lang');
      }
    });

    it(`translates the advisory card into ${lang}`, () => {
      localStorage.setItem('km_lang', lang);
      try {
        renderLanding();
        expect(screen.getByText(advisory)).toBeInTheDocument();
        expect(screen.queryByText("Today's advisory")).toBeNull();
        expect(screen.queryByText('Neem oil to control aphids')).toBeNull();
      } finally {
        localStorage.removeItem('km_lang');
      }
    });

    it(`translates the feature cards into ${lang}`, () => {
      localStorage.setItem('km_lang', lang);
      try {
        const { container } = renderLanding();
        // Feature/how-it-works copy must not stay in English.
        expect(container.innerHTML).not.toContain('Crop Advisor');
        expect(container.innerHTML).not.toContain('How it works');
        expect(container.innerHTML).not.toContain('Everything your farm needs');
      } finally {
        localStorage.removeItem('km_lang');
      }
    });
  }
});
