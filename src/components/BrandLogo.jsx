import utnLogo from "../../assets/utn-logo.png";

export default function BrandLogo({ className = "", title = "UTN TUC" }) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <img src={utnLogo} alt={title} />
    </span>
  );
}
