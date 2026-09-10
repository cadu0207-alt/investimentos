import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Informações da conta e do sistema" />
      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500 uppercase">E-mail</dt>
            <dd className="text-slate-200 mt-1">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase">Conta criada em</dt>
            <dd className="text-slate-200 mt-1">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-600 mt-6">
          Sistema pessoal de investimentos — dados armazenados em banco Supabase com Row Level Security, acessíveis apenas por esta conta.
        </p>
      </Card>
    </div>
  );
}
