"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  FileText,
  Lock,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface FormState {
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  memberId: string;
  purchaseDate: string;
  amount: string;
  harm: string;
}

const CLAIM_DEADLINE = "September 30, 2025";
const CASE_CAPTION =
  "In re: DemoCorp Data Security Litigation, Case No. 3:24-cv-04471 (N.D. Cal.)";

/**
 * Derive a stable pseudo-random confirmation id from entered data.
 * Avoids Math.random / Date.now (may be unavailable in demo environment).
 */
function confirmationNumber(form: FormState): string {
  const seed = `${form.fullName}|${form.email}|${form.memberId}|${form.amount}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const digits = (hash % 1000000).toString().padStart(6, "0");
  return `DC-CLM-${digits}`;
}

export default function MockClaimPage() {
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [attested, setAttested] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    address: "482 Elm Street, Apt 6B",
    city: "Oakland",
    state: "CA",
    zip: "94607",
    memberId: "DC-4471-8829",
    purchaseDate: "2024-03-11",
    amount: "90.00",
    harm: "Out-of-pocket losses",
  });

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const step1Valid =
    form.fullName.trim().length > 0 && form.email.trim().length > 0;

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Official top bar */}
      <header className="bg-slate-800 text-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-xl leading-none">
              ⚖️
            </span>
            <span className="text-xs sm:text-sm font-serif tracking-wide">
              Settlement Claims Administrator
            </span>
          </div>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-300">
            Official Portal
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Caption / masthead block */}
        <section className="border border-neutral-300 bg-white shadow-sm">
          <div className="border-b border-neutral-300 px-6 py-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Official Settlement Claim
            </p>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-neutral-900">
              DemoCorp Data Breach Settlement
            </h1>
            <p className="mt-2 font-serif text-sm italic text-neutral-600">
              {CASE_CAPTION}
            </p>
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 text-xs text-neutral-600">
              <span>
                <span className="font-semibold text-neutral-800">
                  Claim Deadline:
                </span>{" "}
                {CLAIM_DEADLINE}
              </span>
              <span>
                <span className="font-semibold text-neutral-800">
                  Claim Form:
                </span>{" "}
                Rev. 2024-A
              </span>
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 border-t border-neutral-200 pt-2">
              Submitting a false claim is subject to penalty of perjury.
            </p>
          </div>

          {/* Step indicator */}
          {!submitted && (
            <div className="px-6 py-4 bg-neutral-100 border-b border-neutral-300">
              <ol className="flex items-center justify-between text-xs">
                {[
                  { n: 1, label: "Contact Info" },
                  { n: 2, label: "Purchase Details" },
                  { n: 3, label: "Certification" },
                ].map((s, idx) => {
                  const active = step === s.n;
                  const done = step > s.n;
                  return (
                    <li
                      key={s.n}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <span
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                          active
                            ? "border-slate-800 bg-slate-800 text-white"
                            : done
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-neutral-400 bg-white text-neutral-500",
                        ].join(" ")}
                      >
                        {done ? "✓" : s.n}
                      </span>
                      <span
                        className={[
                          "truncate",
                          active
                            ? "font-semibold text-neutral-900"
                            : "text-neutral-500",
                        ].join(" ")}
                      >
                        {s.label}
                      </span>
                      {idx < 2 && (
                        <span
                          aria-hidden
                          className="hidden sm:block flex-1 h-px bg-neutral-300 mx-1"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-6">
            {submitted ? (
              <SuccessScreen confirmation={confirmationNumber(form)} form={form} />
            ) : step === 1 ? (
              <StepOne form={form} update={update} />
            ) : step === 2 ? (
              <StepTwo form={form} update={update} />
            ) : (
              <StepThree
                form={form}
                attested={attested}
                setAttested={setAttested}
              />
            )}

            {/* Nav buttons */}
            {!submitted && (
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-neutral-200 pt-5">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                    className="inline-flex items-center gap-1 rounded-sm border border-neutral-400 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="text-sm text-slate-600 underline underline-offset-2 hover:text-slate-800"
                  >
                    ← Back to Settlers
                  </Link>
                )}

                {step === 1 && (
                  <button
                    type="button"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 rounded-sm bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1 rounded-sm bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {step === 3 && (
                  <button
                    type="button"
                    disabled={!attested}
                    onClick={() => setSubmitted(true)}
                    className="inline-flex items-center gap-2 rounded-sm bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                  >
                    <Lock className="h-4 w-4" />
                    Submit Claim
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-400">
          This is a claims administration portal operated on behalf of the
          Settlement Administrator. Do not send correspondence directly to the
          Court. All fields marked required must be completed. For assistance,
          contact the Settlement Administrator at 1-800-555-0142.
        </p>
      </main>
    </div>
  );
}

/* ---------- Field primitives ---------- */

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-neutral-600"
      >
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-inner focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
      />
    </div>
  );
}

/* ---------- Steps ---------- */

function StepOne({
  form,
  update,
}: {
  form: FormState;
  update: (k: keyof FormState) => (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-neutral-900 flex items-center gap-2">
        <FileText className="h-5 w-5 text-slate-600" />
        Part I — Claimant Contact Information
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Provide the name and mailing address of the settlement class member.
        Payment, if approved, will be issued to this claimant.
      </p>

      <div className="mt-5 space-y-4">
        <Field
          id="fullName"
          label="Full Legal Name"
          value={form.fullName}
          onChange={update("fullName")}
          required
        />
        <Field
          id="email"
          label="Email Address"
          type="email"
          value={form.email}
          onChange={update("email")}
          required
        />
        <Field
          id="address"
          label="Mailing Address"
          value={form.address}
          onChange={update("address")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="sm:col-span-3">
            <Field
              id="city"
              label="City"
              value={form.city}
              onChange={update("city")}
            />
          </div>
          <div className="sm:col-span-1">
            <Field
              id="state"
              label="State"
              value={form.state}
              onChange={update("state")}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              id="zip"
              label="ZIP Code"
              value={form.zip}
              onChange={update("zip")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTwo({
  form,
  update,
}: {
  form: FormState;
  update: (k: keyof FormState) => (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-neutral-900 flex items-center gap-2">
        <FileText className="h-5 w-5 text-slate-600" />
        Part II — Purchase &amp; Eligibility Details
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Identify the transaction giving rise to your claim. Your Member ID
        appears on the notice mailed to class members.
      </p>

      <div className="mt-5 space-y-4">
        <Field
          id="memberId"
          label="Settlement Member ID"
          value={form.memberId}
          onChange={update("memberId")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="purchaseDate"
            label="Date of Purchase"
            type="date"
            value={form.purchaseDate}
            onChange={update("purchaseDate")}
          />
          <Field
            id="amount"
            label="Amount Claimed (USD)"
            value={form.amount}
            onChange={update("amount")}
          />
        </div>
        <div>
          <label
            htmlFor="harm"
            className="block text-xs font-semibold uppercase tracking-wide text-neutral-600"
          >
            Category of Harm
          </label>
          <select
            id="harm"
            value={form.harm}
            onChange={(e) => update("harm")(e.target.value)}
            className="mt-1 w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-inner focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
          >
            <option>Out-of-pocket losses</option>
            <option>Lost time</option>
            <option>Both out-of-pocket losses and lost time</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-neutral-200 last:border-b-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function StepThree({
  form,
  attested,
  setAttested,
}: {
  form: FormState;
  attested: boolean;
  setAttested: (v: boolean) => void;
}) {
  return (
    <div>
      {/* Hand-off annotation callout */}
      <div className="mb-5 rounded-sm bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 text-sm">
        ⏸ Settlers&apos;s agent stopped here. Review the details and sign to
        submit.
      </div>

      <h2 className="font-serif text-lg font-semibold text-neutral-900 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-slate-700" />
        Part III — Certification
      </h2>

      {/* Prominent certification notice */}
      <div className="mt-4 rounded-sm border-2 border-slate-800 bg-slate-50">
        <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-800 px-4 py-2 text-white">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Certification under penalty of perjury
          </span>
        </div>

        {/* Review summary */}
        <div className="px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Review of Submitted Information
          </p>
          <dl className="mt-2 text-sm">
            <SummaryRow label="Full Legal Name" value={form.fullName} />
            <SummaryRow label="Email Address" value={form.email} />
            <SummaryRow label="Mailing Address" value={form.address} />
            <SummaryRow
              label="City / State / ZIP"
              value={`${form.city}, ${form.state} ${form.zip}`}
            />
            <SummaryRow label="Settlement Member ID" value={form.memberId} />
            <SummaryRow label="Date of Purchase" value={form.purchaseDate} />
            <SummaryRow
              label="Amount Claimed"
              value={form.amount ? `$${form.amount}` : ""}
            />
            <SummaryRow label="Category of Harm" value={form.harm} />
          </dl>
        </div>

        {/* Attestation */}
        <div className="border-t border-slate-300 bg-white px-4 py-4">
          <p className="font-serif text-sm italic text-neutral-700">
            &ldquo;I declare under penalty of perjury under the laws of the
            United States that the foregoing is true and correct, and that I am a
            member of the settlement class.&rdquo;
          </p>
          <label
            htmlFor="attest"
            className="mt-4 flex items-start gap-3 cursor-pointer select-none"
          >
            <input
              id="attest"
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-sm border-neutral-400 accent-green-700"
            />
            <span className="text-sm text-neutral-800">
              I have read and agree to the certification above, and I sign this
              claim under penalty of perjury.
            </span>
          </label>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-neutral-500">
        Electronic signature via this checkbox has the same legal effect as a
        handwritten signature. Do not check this box unless every statement
        above is true and correct.
      </p>
    </div>
  );
}

/* ---------- Success ---------- */

function SuccessScreen({
  confirmation,
  form,
}: {
  confirmation: string;
  form: FormState;
}) {
  return (
    <div className="text-center py-6">
      <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
      <h2 className="mt-4 font-serif text-2xl font-semibold text-neutral-900">
        Claim submitted
      </h2>
      <p className="mt-2 text-sm text-neutral-600">
        Your claim in the DemoCorp Data Breach Settlement has been received and
        recorded.
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-sm border border-neutral-300 bg-neutral-50 px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Confirmation Number
        </p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-slate-800">
          {confirmation}
        </p>
      </div>

      <p className="mx-auto mt-6 max-w-md text-sm text-neutral-600">
        A confirmation email will be sent to{" "}
        <span className="font-medium text-neutral-900">{form.email}</span>.
        Please retain your confirmation number for your records. No further
        action is required at this time.
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          ← Back to Settlers
        </Link>
      </div>
    </div>
  );
}
