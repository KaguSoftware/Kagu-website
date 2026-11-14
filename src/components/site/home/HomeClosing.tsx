import { NavLink } from "@/components/site/NavLink";
import { AsciiLogo } from "@/components/ascii/AsciiLogo";
import "./home.css";

/* A glass card with the small turning ASCII Kagu mark above the invitation. */
export function HomeClosing({ email }: { email: string }) {
  return (
    <section className="hsec hsec--tight site-wrap" aria-labelledby="home-idea">
      <div className="cta">
        <div className="cta__card glass">
          <div className="cta__logo" aria-hidden="true">
            <AsciiLogo />
          </div>
          <p className="hlabel">
            <span>02</span> Start a project
          </p>
          <h2 id="home-idea">Got an idea?</h2>
          <a className="mail" href={`mailto:${email}`}>
            {email}
          </a>
          <NavLink className="site-btn" href="/contact">
            Let&rsquo;s talk
          </NavLink>
        </div>
      </div>
    </section>
  );
}
