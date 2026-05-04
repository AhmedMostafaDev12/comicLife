import HeroSection from '@/components/landing/HeroSection'
import StyleSection from '@/components/landing/StyleSection'
import WriteSection from '@/components/landing/WriteSection'
import HowItWorks from '@/components/landing/HowItWorks'
import CtaStrip from '@/components/landing/CtaStrip'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-cream selection:bg-yellow selection:text-ink">
      <HeroSection />
      <StyleSection />
      <WriteSection />
      <HowItWorks />
      <CtaStrip />
      <Footer />
    </main>
  )
}
