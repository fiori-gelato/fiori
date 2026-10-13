import { asset, PACK_PDF } from "@/lib/site";

export default function Footer() {
  return (
    <footer>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="protea"
        src={asset("/brand/protea/protea-latte.svg")}
        alt=""
        aria-hidden="true"
      />
      <div className="footer-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/brand/logo/fiori-complete-latte.png")} alt="Fiori Gelato" />
        <span>
          Gelato made in small batches<span className="dots"> •</span> Investor
          information pack, July 2026
        </span>
        <span>
          <a href={PACK_PDF} target="_blank" rel="noopener">
            Investor information pack (PDF)
          </a>{" "}
          · Cape Town · Prepared by Muhammed Kolabhai
        </span>
      </div>
    </footer>
  );
}
