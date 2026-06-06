import Image from "next/image";
import Link from "next/link";
import { getStudio, getTeam, type TeamMember } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { SectionRise } from "@/components/motion/SectionRise";
import { Eyebrow } from "@/components/layout/Eyebrow";

export const metadata = {
  title: "Team · Kagu",
  description:
    "The people behind Kagu — cofounders and associates building software for boutique operators.",
};

const SEGMENT_LABEL: Record<TeamMember["segment"], string> = {
  cofounder: "Cofounder",
  associate: "Associate",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Round headshot — image when provided, an elegant initials disc otherwise. */
function Avatar({ member, size }: { member: TeamMember; size: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        // em-based initials scale with the disc size
        fontSize: size,
        flex: "0 0 auto",
        position: "relative",
        borderRadius: "9999px",
        overflow: "hidden",
        background: "var(--mint-pale)",
        border: "1px solid var(--neutral)",
      }}
    >
      {member.image ? (
        <Image
          src={member.image}
          alt={member.name}
          fill
          sizes="(max-width: 768px) 120px, 160px"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span
          aria-hidden
          className="display"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.36em",
            color: "var(--slate-ink)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {initials(member.name)}
        </span>
      )}
    </div>
  );
}

function MemberRow({
  member,
  avatarSize,
  nameSize,
}: {
  member: TeamMember;
  avatarSize: string;
  nameSize: string;
}) {
  return (
    <SectionRise as="article" amount={0.4}>
      <div
        className="flex flex-col md:flex-row gap-6 md:gap-10 items-start"
        style={{
          borderTop: "1px solid var(--neutral)",
          paddingTop: "var(--space-8)",
        }}
      >
        <Avatar member={member} size={avatarSize} />
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div
            className="flex flex-col items-start"
            style={{ gap: "var(--space-3)", marginBottom: "var(--space-3)" }}
          >
            <span
              className="font-mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-deep)",
                border: "1px solid var(--mint-deep)",
                borderRadius: "9999px",
                padding: "3px 10px",
                lineHeight: 1,
              }}
            >
              {SEGMENT_LABEL[member.segment]}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-deep)",
              }}
            >
              {member.role}
            </span>
          </div>
          <h3
            className="display"
            style={{
              fontSize: nameSize,
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
              marginBottom: "var(--space-4)",
            }}
          >
            {member.name}
          </h3>
          {member.bio ? (
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.7,
                color: "var(--ink)",
                maxWidth: "56ch",
              }}
            >
              {member.bio}
            </p>
          ) : null}
        </div>
      </div>
    </SectionRise>
  );
}

export default async function TeamPage() {
  const [studio, team] = await Promise.all([getStudio(), getTeam()]);
  // Cofounders lead, associates follow — segment now reads from each member's
  // pill rather than a section split.
  const members = [
    ...team.filter((m) => m.segment === "cofounder"),
    ...team.filter((m) => m.segment === "associate"),
  ];

  return (
    <>
      {/* Hero */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-24) min-h-[55dvh] flex items-end"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            People · est. 2025
          </span>
          <WordMaskReveal
            as="h1"
            text="The people behind the work."
            className="display"
          />
          <p
            style={{
              marginTop: "var(--space-8)",
              maxWidth: "48ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.5,
              color: "var(--slate-ink)",
            }}
          >
            A small team{studio.location ? ` in ${studio.location}` : ""}, building
            customer surfaces and operator-facing admins against the same database —
            and staying close enough to every project that the handover actually holds.
          </p>
        </div>
      </section>

      {/* Team — cofounders and associates in one list, segment shown as a pill */}
      {members.length > 0 ? (
        <section
          style={{ background: "var(--paper)" }}
          className="px-(--container-x) py-(--section-y)"
        >
          <div className="w-full max-w-(--container-max) mx-auto">
            <Eyebrow number="01">The team</Eyebrow>
            <div
              className="flex flex-col"
              style={{ marginTop: "var(--space-12)", gap: "var(--space-16)" }}
            >
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  avatarSize="clamp(156px, 22.5vw, 225px)"
                  nameSize="var(--type-3xl)"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Closing line → contact */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div
          className="w-full max-w-(--container-max) mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <p
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.1,
              color: "var(--slate-ink)",
              maxWidth: "18ch",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            We&apos;re always interested in people who build for operators.
          </p>
          <Link
            href="/contact"
            data-cursor="view"
            className="font-mono inline-flex items-center gap-3 self-start md:self-auto"
            style={{
              fontSize: "var(--type-sm)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--ink)",
              borderBottom: "1px solid var(--mint-deep)",
              paddingBottom: 6,
              whiteSpace: "nowrap",
            }}
          >
            Get in touch
            <span
              aria-hidden
              style={{ width: 28, height: 1, background: "var(--mint-deep)" }}
            />
          </Link>
        </div>
      </section>

      <SiteFooter studio={studio} />
    </>
  );
}
