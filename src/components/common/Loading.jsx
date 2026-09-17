import { Building2, Database, LoaderCircle } from "lucide-react";

const LOADING_DETAILS = {
  institutions: {
    eyebrow: "Institution registry",
    Icon: Building2,
    detail: "Preparing the latest campus records"
  },
  responses: {
    eyebrow: "Survey data",
    Icon: Database,
    detail: "Organizing submitted response records"
  }
};

export default function Loading({ label = "Loading...", variant }) {
  const details = LOADING_DETAILS[variant] || {
    eyebrow: "Childcare development dashboard",
    Icon: LoaderCircle,
    detail: "Connecting to the latest information"
  };
  const { Icon } = details;

  return (
    <div className="loading-stage" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-orb loading-orb-one" />
      <div className="loading-orb loading-orb-two" />
      <div className="loading-card">
        <div className="loading-icon-wrap">
          <span className="loading-ring" aria-hidden="true" />
          <Icon className="loading-icon" size={25} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="loading-copy">
          <p className="loading-eyebrow">{details.eyebrow}</p>
          <p className="loading-title">{label}</p>
          <p className="loading-detail">{details.detail}</p>
        </div>
        <div className="loading-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
