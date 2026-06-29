import Link from "next/link";

type CheckoutDisclosureProps = {
  planName: string;
  price: string;
  period?: string;
  paymentFrequency?: string;
  className?: string;
};

export function CheckoutDisclosure({
  planName,
  price,
  period = "lunară",
  paymentFrequency = "Lunar, cu reînnoire automată",
  className = "",
}: CheckoutDisclosureProps) {
  return (
    <div
      className={`rounded-[1.5rem] border border-subtle bg-app p-4 text-xs leading-5 text-muted ${className}`}
    >
      <p className="font-black text-content">Informații înainte de plată</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-bold text-content">Plan</dt>
          <dd>{planName}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Preț total</dt>
          <dd>{price} RON</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Monedă</dt>
          <dd>RON</dd>
        </div>
        <div>
          <dt className="font-bold text-content">TVA</dt>
          <dd>Inclus, dacă este aplicabil</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Perioadă abonament</dt>
          <dd>{period}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Frecvența plății</dt>
          <dd>{paymentFrequency}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Anulare</dt>
          <dd>
            Din pagina{" "}
            <Link
              href="/anulare-abonament"
              className="font-bold text-content underline decoration-subtle underline-offset-4"
            >
              Anulare abonament
            </Link>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-content">Intrare în vigoare</dt>
          <dd>Anularea oprește următoarea reînnoire.</dd>
        </div>
      </dl>
      <p className="mt-3">
        Informații despre dreptul de retragere sunt disponibile în pagina{" "}
        <Link
          href="/retragere-din-contract"
          className="font-bold text-content underline decoration-subtle underline-offset-4"
        >
          Retragere din contract
        </Link>
        . Prin apăsarea butonului de plată accepți{" "}
        <Link
          href="/termeni-si-conditii"
          className="font-bold text-content underline decoration-subtle underline-offset-4"
        >
          Termenii și condițiile
        </Link>
        .
      </p>
    </div>
  );
}
