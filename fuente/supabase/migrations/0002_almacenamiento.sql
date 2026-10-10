-- Hereda+ · almacenamiento de documentos en Supabase Storage (bucket privado "documentos")
-- Ruta de cada fichero: <despacho_id>/<expediente_id>/<nombre>. Solo los miembros del despacho acceden.
-- Requiere 0001. Sin prueba local: se valida en el proyecto de Supabase de preproducción.
insert into storage.buckets (id, name, public, file_size_limit) values ('documentos', 'documentos', false, 26214400)
on conflict (id) do nothing;

create policy docs_ver on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and es_miembro(((storage.foldername(name))[1])::uuid));
create policy docs_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and puede_editar(((storage.foldername(name))[1])::uuid));
create policy docs_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and es_titular(((storage.foldername(name))[1])::uuid));
