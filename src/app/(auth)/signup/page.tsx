import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-field-dark px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-field-turf/20 border-2 border-field-line/40 mb-4">
            <span className="text-2xl">🏈</span>
          </div>
          <h1 className="text-2xl font-bold text-field-cream">The Field</h1>
          <p className="text-field-cream/60 mt-1 text-sm">
            Brothers Metal Roofing Lead Pipeline
          </p>
        </div>

        <div className="rounded-xl border border-field-line/20 bg-field-turf/10 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-field-cream mb-4">Create Account</h2>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}