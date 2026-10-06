export function SchoolEmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[#cbd6ce] bg-white px-5 py-10 text-center">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function SchoolLoadError() {
  return (
    <div role="alert" className="border-l-2 border-[#b54d36] bg-[#f9ebe6] px-4 py-3 text-sm text-[#813523]">
      Não foi possível carregar os dados. Atualize a página para tentar novamente.
    </div>
  );
}

export function formatDatePtBr(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}