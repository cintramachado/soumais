import Image from "next/image";

export function SetupNotice() {
  return (
    <main className="flex min-h-screen w-full min-w-0 items-center justify-center overflow-x-hidden bg-[#f5f7f4] px-5 py-12 text-[#172522]">
      <section className="w-full min-w-0 max-w-lg border-t-4 border-[#126b63] bg-white p-6 shadow-sm sm:p-9">
        <Image
          src="/brand/soul-mais-cristo.jpg"
          alt="Soul+ em Cristo"
          width={240}
          height={135}
          className="mb-8 h-auto w-52 object-contain"
          priority
        />
        <h1 className="text-2xl font-semibold">Conecte o Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-[#586a64]">
          Configure a URL do projeto e a chave publicável em <code>.env.local</code> para habilitar o login.
        </p>
        <pre className="mt-5 w-full min-w-0 max-w-full overflow-x-auto bg-[#f2f5f1] p-4 text-xs leading-6 text-[#25413b]">
          <code>{"NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica"}</code>
        </pre>
        <p className="mt-4 text-xs leading-5 text-[#71817c]">
          Nunca configure a chave secreta ou service role no navegador.
        </p>
      </section>
    </main>
  );
}