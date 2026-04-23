**Vaga Certa - Sistema de Monitoramento de Estacionamento**

O Vaga Certa é uma solução para gestão de ocupação de vagas de estacionamento baseada em lógica de sensores de proximidade. O projeto aplica algoritmos de filtragem de dados para garantir a precisão dos estados de ocupação, evitando leituras falsas causadas por interferências externas.

**Funcionalidades Principais**

**Monitoramento Simultâneo:** Interface centralizada para visualização do status de todas as vagas em tempo real.

**Filtro de Confirmação em 3 Estágios:** Implementação de algoritmo de estabilização. Uma entrada só é validada após três leituras consecutivas dentro do limite de distância configurado.

**Saída Instantânea:** Lógica de liberação imediata assim que o sensor detecta a ausência do veículo, priorizando a atualização da disponibilidade.

**Painel de Configuração:** Interface para ajuste da quantidade de vagas e calibração da distância de detecção do sensor (1 a 300 cm).

**Exportação de Dados:** Geração de logs de atividade e exportação de relatórios em formatos PDF e JSON.

**Validação via Console:** Sistema de rastreamento detalhado no terminal do desenvolvedor para auditoria dos contadores de confirmação.

**Tecnologias Utilizadas**

**HTML5 e CSS3:** Estrutura e estilização responsiva com foco em usabilidade.

**JavaScript (ES6+):** Motor de processamento dos sensores e gerenciamento do estado em memória.

**Web Storage API (LocalStorage):** Persistência de configurações e histórico de logs no navegador.

**jsPDF:** Biblioteca para renderização e exportação de documentos PDF.

**Lógica de Funcionamento**

O sistema opera em um ciclo de varredura de 1 Hertz (uma leitura por segundo), seguindo o fluxo de decisão abaixo:

**Amostragem:** O sistema gera uma leitura de distância para cada vaga cadastrada.

**Processamento de Entrada:**

Se a leitura for menor ou igual ao limite definido, o contador de confirmação é incrementado.

Ao atingir três confirmações sucessivas, o status da vaga é alterado para Ocupado.

Caso uma leitura apresente valor superior ao limite antes da terceira confirmação, o contador é resetado.

**Processamento de Saída:**

Se a vaga estiver ocupada e a leitura for superior ao limite, o estado é revertido para Livre sem a necessidade de confirmações múltiplas.

**Banco de Dados**

O sistema utiliza **SQLite** para persistência permanente de todos os dados, gerenciado por um servidor Node.js local.

Tabelas:
- `configuracoes` — parâmetros do sistema (quantidade de vagas, limite do sensor)
- `vagas` — estado atual de cada vaga (VERDE / VERMELHO) com timestamp da última alteração
- `historico` — registro completo de todos os eventos de ENTRADA e SAIDA (vaga, tipo, distância do sensor, data/hora)
- `sessoes` — períodos completos de ocupação: quando a vaga foi ocupada, quando ficou disponível e duração em minutos

O banco é criado automaticamente em `backend/vagacerta.db` na primeira execução.

**Instruções de Instalação e Execução**

**Pré-requisito:** Node.js instalado (https://nodejs.org — versão LTS recomendada).

**Windows (forma mais simples):** Dê duplo clique no arquivo `iniciar.bat`. Ele instala as dependências automaticamente na primeira vez e inicia o servidor.

**Manual (qualquer sistema):**

```
cd backend
npm install
node server.js
```

Acesse o sistema em: **http://localhost:3000**

O sistema não deve mais ser aberto diretamente como arquivo (file://) — utilize sempre a URL acima após iniciar o servidor.

Utilize a página de configurações para definir os parâmetros operacionais do estacionamento.

Monitore as etapas de validação através do Console do Desenvolvedor (tecla F12).

**Licença**

Projeto desenvolvido para fins de estudo de lógica de programação e arquitetura de sistemas front-end. Permite-se a utilização e modificação para fins educacionais.
