import { Badge } from "@/components/ui/badge";
import { site, home } from "@/content/site";
import { GraduationCap, BadgeCheck, Briefcase, type LucideIcon } from "lucide-react";

const STEP_ICONS: LucideIcon[] = [GraduationCap, BadgeCheck, Briefcase];

/** The value-prop panel that sits beside the form on wide screens — hidden
 * on small screens, where only the form itself matters. */
export function SignupHero() {
  return (
    <div className="hidden flex-col justify-center gap-6 bg-muted/40 p-8 md:flex">
      <Badge className="w-fit">Join {site.name}</Badge>
      <div>
        <h2 className="font-display text-3xl font-semibold text-balance">
          Learn. Prove.{" "}
          <span className="text-primary">Get hired.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">{site.description}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {home.ladder.steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li key={step.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
