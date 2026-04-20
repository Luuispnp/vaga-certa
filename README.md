Vaga Certa - Sistema de Monitoramento de Estacionamento
O Vaga Certa e um simulador de gerenciamento de vagas de estacionamento em tempo real. O projeto aplica conceitos de Sistemas Embarcados, como o ciclo de Super-Loop e a abstracao de hardware (sensores), em um ambiente Web para monitorar ocupacao, filtrar ruidos de leitura e gerar relatorios analiticos.

Funcionalidades
Simulacao de Hardware: Abstracao de sensores ultrassonicos que geram dados de distancia dinamicamente.

Filtro de Ruido (RF07): Implementacao de logica de confirmacao em multiplos ciclos (debouncing) para diferenciar veiculos de pedestres ou objetos transitorios.

Calibracao Dinamica: Interface para ajuste do limite de distancia dos sensores e da quantidade de vagas sem interrupcao do sistema.

Persistencia de Dados: Utilizacao de um buffer de memoria global que preserva o historico de eventos mesmo apos a reconfiguracao ou reinicio do layout do patio.

Exportacao de Dados:

JSON: Geracao de arquivo com o historico completo de logs para analise externa.

Relatorio de Pico (PDF): Processamento de dados historicos para identificar faixas horarias de maior ocupacao.

Tecnologias Utilizadas
JavaScript (ES6+): Uso de Orientacao a Objetos (Classes), manipulacao de DOM e gerenciamento de processos assincronos.

HTML5: Estrutura para controle e exibicao dos componentes.

CSS3: Design estruturado com foco em usabilidade e feedback visual de estados (Verde para livre, Vermelho para ocupado).

Arquitetura do Software
O sistema foi desenhado para operar como um firmware de microcontrolador:

Camada de Hardware: A classe SensorUltrassonico simula a entrada de dados analogicos.

Camada de Objeto de Negocio: A classe Vaga encapsula a logica de estado, contadores de confirmacao e seu proprio historico.

Camada de Controle: A classe SistemaEstacionamento gerencia o Super-Loop, processando todas as vagas a cada 1000ms e atualizando a interface.

Camada de Dados: Um buffer externo (historicoGlobal) garante a integridade dos dados coletados durante toda a sessao de uso.

Como Instalar e Executar
Clone o repositorio:

Bash
git clone https://github.com/seu-usuario/vaga-certa.git
Navegue ate o diretorio do projeto.

Certifique-se de que a estrutura de pastas esta preservada:

/index.html

/scripts/script.js

/styles/styles.css

Abra o arquivo index.html em um navegador.

Requisitos de Sistema Implementados
RF07: O sensor deve confirmar a presenca do veiculo por pelo menos 3 ciclos consecutivos antes de alterar o estado da vaga para ocupada, evitando falsos positivos causados por pedestres passando em frente ao sensor.

Licenca
Este projeto e destinado a fins academicos e demonstracao de competencias em arquitetura de sistemas e logica de programacao.