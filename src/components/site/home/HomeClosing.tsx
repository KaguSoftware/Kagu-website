import Link from "next/link";
import "./home.css";

export function HomeClosing({ email }: { email: string }) {
  return (
    <section className="hsec hsec--tight site-wrap" aria-labelledby="home-idea">
      <div className="cta-band">
        <h2 id="home-idea">Got an idea?</h2>
        <span className="mail">{email}</span>
        <Link className="site-btn" href="/about#contact">
          Let&rsquo;s talk
        </Link>
      </div>
    </section>
  );
}
