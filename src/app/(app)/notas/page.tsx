import { getStrategyNotes } from "@/lib/domain/queries";
import { PageHeader, Card, Label, Input, Textarea, Button, EmptyState, Badge } from "@/components/ui";
import { addNote, deleteNote } from "./actions";
import { formatDate } from "@/lib/domain/format";

export default async function NotasPage() {
  const notes = await getStrategyNotes();

  return (
    <div>
      <PageHeader
        title="Notas de estratégia"
        subtitle="Análises livres, teses, catalisadores e qualquer outro ponto de estratégia que não se encaixe nos outros módulos"
      />

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Nova nota</h2>
        <form action={addNote} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Data</Label>
              <Input name="note_date" type="date" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label>Título</Label>
              <Input name="title" placeholder="ex: Catalisador privatização Copasa" />
            </div>
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea name="content" rows={4} required />
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input name="tags" placeholder="opções, privatização, macro" />
          </div>
          <Button type="submit">Salvar nota</Button>
        </form>
      </Card>

      {notes.length === 0 ? (
        <EmptyState title="Nenhuma nota registrada ainda" />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {n.title && <h3 className="text-sm font-medium text-slate-100">{n.title}</h3>}
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(n.note_date)}</p>
                </div>
                <form action={deleteNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs text-red-400 hover:underline" type="submit">
                    Remover
                  </button>
                </form>
              </div>
              <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">{n.content}</p>
              {n.tags && n.tags.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {n.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
