export type UnidadeProduto = 'unidade' | 'kg'

export interface Produto {
  id: string
  nome: string
  codigo_barras: string | null
  codigo_interno: string
  unidade: UnidadeProduto
  preco: number
  categoria: string | null
  estoque_atual: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type NovoProduto = Pick<Produto, 'nome' | 'unidade' | 'preco'> &
  Partial<Pick<Produto, 'codigo_barras' | 'categoria' | 'estoque_atual'>>
