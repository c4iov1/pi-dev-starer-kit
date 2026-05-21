# A Anatomia de um Harness de Agente

**TLDR:** Agente = Modelo + Harness. A engenharia de harness é como construímos sistemas em torno dos modelos para transformá-los em motores de trabalho. O modelo contém a inteligência e o harness torna essa inteligência útil. Hoje, definimos o que é um harness e derivamos os componentes centrais que os agentes de hoje e do futuro precisam.

> [!NOTE]
> **Nota do Tradutor (Adição):** O termo "Harness" (que pode ser traduzido como "arreio" ou "cinto de segurança") neste contexto de software refere-se à infraestrutura de suporte, ferramentas, *scaffolding* e controle de execução que envolvem o modelo base. Optamos por manter o termo "Harness" no original, pois já é amplamente utilizado na área de engenharia de IA.

## Alguém pode, por favor, definir um "Harness"?

**Agente = Modelo + Harness**

Se você não é o modelo, você é o harness.

Um harness é cada pedaço de código, configuração e lógica de execução que não é o modelo em si. Um modelo bruto não é um agente. Mas ele se torna um quando um harness lhe fornece coisas como estado, execução de ferramentas, ciclos de feedback (feedback loops) e restrições aplicáveis.

Concretamente, um harness inclui coisas como:
* System Prompts (Prompts de Sistema)
* Tools (Ferramentas), Skills (Habilidades), MCPs e suas descrições
* Infraestrutura empacotada (sistema de arquivos, sandbox, navegador)
* Lógica de Orquestração (criação de subagentes, repasses/handoffs, roteamento de modelo)
* Hooks/Middleware para execução determinística (compactação, continuação, verificações de lint)

Existem muitas maneiras confusas de dividir as fronteiras de um sistema de agente entre o modelo e o harness. Mas, na minha opinião, esta é a definição mais limpa porque nos força a pensar em projetar sistemas em torno da inteligência do modelo.

O resto desta postagem percorre os componentes centrais do harness e deriva por que cada peça existe, trabalhando de trás para frente a partir da primitiva central de um modelo.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ HARNESS (Agente operacional)                                                │
│                                                                             │
│                        Context Injection                                    │
│                 (prompts, memory, skills, conv.)                            │
│                                │                                            │
│                                ▼                                            │
│   Control               ┌───────────────┐               Action              │
│ (compaction,            │     MODEL     │──────────▶ (calls bash,           │
│  orchestration,  ──────▶│   reasons ➔   │◀ ─ ─ ─ ─ ─  tools, MCPs)        │
│  ralph loops)           │    decides    │     (results back to context)     │
│                         └───────────────┘                                   │
│                           │ ▲       ▲ └ ─ ─ ─ ─ ─ ─ ┐                       │
│                           │ │       │               │                       │
│                    writes │ │ reads │        Observe & Verify               │
│                           ▼ │       │      (browser screenshots,            │
│                        Persist      │        test results, logs)            │
│                (filesystem, git,    │               │                       │
│                 progress files)     └ ─ ─ ─ ─ ─ ─ ─ ┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Por que precisamos de Harnesses… Da perspectiva de um modelo

Existem coisas que queremos que um agente faça que um modelo não pode fazer logo de cara (*out of the box*). É aqui que entra um harness.

Modelos (em sua maioria) recebem dados como texto, imagens, áudio, vídeo e produzem texto. É isso. Logo de cara, eles não podem:
* Manter um estado durável ao longo das interações
* Executar código
* Acessar conhecimento em tempo real
* Configurar ambientes e instalar pacotes para concluir o trabalho

Esses são todos recursos em nível de harness. A estrutura dos LLMs exige algum tipo de maquinário que os envolva para realizar trabalho útil.

Por exemplo, para obter uma UX (Experiência do Usuário) de produto como "bate-papo" (chatting), envolvemos o modelo em um loop *while* para rastrear mensagens anteriores e anexar novas mensagens do usuário. Todo mundo que está lendo isso já usou esse tipo de harness. A ideia principal é que queremos converter o comportamento desejado de um agente em um recurso real no harness.

## Trabalhando de trás para frente: do comportamento desejado do agente para a engenharia de harness

A Engenharia de Harness ajuda os humanos a injetar *priors* (conhecimentos prévios) úteis para orientar o comportamento do agente. E conforme os modelos se tornaram mais capazes, os harnesses têm sido usados para estender e corrigir cirurgicamente os modelos a fim de completar tarefas anteriormente impossíveis.

Não revisaremos uma lista exaustiva de cada recurso de harness. O objetivo é derivar um conjunto de recursos a partir do ponto de partida de ajudar os modelos a fazer um trabalho útil. Seguiremos um padrão como este:

**Comportamento que queremos (ou queremos consertar) → Design do Harness para ajudar o modelo a alcançar isso.**

```text
Desired Agent Behavior                      What the Harness Adds
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   Work with real data durably    │───────▶│         Filesystem + Git         │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│      Write & Execute Code        │───────▶│      Bash + Code Execution       │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   Safe Execution + Tooling       │───────▶│ Sandboxed Environments + Tooling │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  Remember & access knowledge     │───────▶│   Memory Files + Search + MCPs   │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ Maintain performance (long ctx)  │───────▶│  Compaction + Offloading + Skills│
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│    Complete long horizon work    │───────▶│ Ralph Loops + Plan + Verification│
└──────────────────────────────────┘        └──────────────────────────────────┘
```

*"Cada recurso do harness deriva de um comportamento que o modelo não consegue entregar sozinho"*

### Sistemas de Arquivos para Armazenamento Durável e Gerenciamento de Contexto

Queremos que os agentes tenham armazenamento durável para interagir com dados reais, descarregar informações que não cabem no contexto e persistir o trabalho entre sessões.

Os modelos só podem operar diretamente no conhecimento dentro de sua janela de contexto. Antes dos sistemas de arquivos, os usuários tinham que copiar/colar o conteúdo diretamente para o modelo, o que é uma UX desajeitada e não funciona para agentes autônomos. O mundo já estava usando sistemas de arquivos para trabalhar, então os modelos foram naturalmente treinados em bilhões de tokens de como usá-los. A solução natural se tornou:

**Harnesses são fornecidos com abstrações de sistema de arquivos e ferramentas para operações no sistema de arquivos (fs-ops).**

O sistema de arquivos é indiscutivelmente a primitiva de harness mais fundamental por causa do que ele desbloqueia:
1. Os agentes ganham um espaço de trabalho (workspace) para ler dados, código e documentação.
2. O trabalho pode ser adicionado e descarregado (offloaded) incrementalmente em vez de manter tudo no contexto. Os agentes podem armazenar saídas intermediárias e manter um estado que sobrevive a uma única sessão.
3. O sistema de arquivos é uma superfície de colaboração natural. Múltiplos agentes e humanos podem se coordenar através de arquivos compartilhados. Arquiteturas como *Agent Teams* (Equipes de Agentes) dependem disso.
4. O Git adiciona versionamento ao sistema de arquivos para que os agentes possam rastrear o trabalho, reverter erros e criar *branches* para experimentos. Revisitaremos o sistema de arquivos mais adiante, pois ele se mostra uma primitiva chave de harness para outros recursos que precisamos.

### Bash + Código como uma Ferramenta de Propósito Geral

Queremos que os agentes resolvam problemas autonomamente, sem que os humanos precisem pré-projetar todas as ferramentas.

O principal padrão de execução de agentes hoje é um loop ReAct, onde um modelo raciocina (reasons), executa uma ação por meio de uma chamada de ferramenta, observa o resultado e repete isso em um loop `while`. Mas os harnesses só podem executar as ferramentas para as quais possuem lógica. Em vez de forçar os usuários a criar ferramentas para cada ação possível, uma solução melhor é dar aos agentes uma ferramenta de uso geral como o bash.

**Harnesses vêm com uma ferramenta bash para que os modelos possam resolver problemas autonomamente escrevendo e executando código.**

A execução de código + bash é um grande passo para dar aos modelos um computador e deixá-los descobrir o resto autonomamente. O modelo pode projetar suas próprias ferramentas instantaneamente através de código em vez de ficar restrito a um conjunto fixo de ferramentas pré-configuradas.

Harnesses ainda vêm com outras ferramentas, mas a execução de código tornou-se a estratégia de uso geral padrão para resolução autônoma de problemas.

### Sandboxes e Ferramentas para Executar e Verificar o Trabalho

Os agentes precisam de um ambiente com os padrões (defaults) corretos para que possam agir com segurança, observar resultados e progredir.

Demos aos modelos armazenamento e a capacidade de executar código, mas tudo isso precisa acontecer em algum lugar. Executar código gerado por agente localmente é arriscado e um único ambiente local não escala para grandes cargas de trabalho de agentes.

**Sandboxes dão aos agentes ambientes operacionais seguros.** Em vez de executar localmente, o harness pode se conectar a um sandbox para executar código, inspecionar arquivos, instalar dependências e concluir tarefas. Isso cria uma execução de código isolada e segura. Para maior segurança, os harnesses podem criar listas de permissões (allow-lists) de comandos e impor isolamento de rede. Sandboxes também desbloqueiam escala, porque os ambientes podem ser criados sob demanda, distribuídos por muitas tarefas e destruídos quando o trabalho é concluído.

Bons ambientes vêm com boas ferramentas padrão. Os harnesses são responsáveis ​​por configurar as ferramentas para que os agentes possam realizar trabalho útil. Isso inclui a pré-instalação de runtimes de linguagens e pacotes, CLIs para git e testes, e navegadores para interação na web e verificação.

Ferramentas como navegadores, logs, capturas de tela (screenshots) e executores de testes dão aos agentes uma maneira de observar e analisar seu trabalho. Isso os ajuda a criar loops de autoverificação onde eles podem escrever código de aplicativo, executar testes, inspecionar logs e corrigir erros.

O modelo não configura seu próprio ambiente de execução de imediato. Decidir onde o agente é executado, quais ferramentas estão disponíveis, o que ele pode acessar e como verifica seu trabalho são todas decisões de design em nível de harness.

### Memória e Pesquisa para Aprendizado Contínuo

Os agentes devem lembrar o que viram e acessar informações que não existiam quando foram treinados.

Os modelos não têm conhecimento adicional além de seus pesos e do que está em seu contexto atual. Sem acesso para editar os pesos do modelo, a única maneira de "adicionar conhecimento" é através da injeção de contexto.

**Para memória, o sistema de arquivos é novamente uma primitiva central.** Harnesses suportam padrões de arquivo de memória como `AGENTS.md` que são injetados no contexto ao iniciar o agente. Conforme os agentes adicionam e editam este arquivo, os harnesses carregam o arquivo atualizado no contexto. Esta é uma forma de aprendizado contínuo onde os agentes armazenam conhecimento de forma durável de uma sessão e injetam esse conhecimento em sessões futuras.

Os cortes de conhecimento (knowledge cutoffs) significam que os modelos não podem acessar diretamente novos dados, como versões de bibliotecas atualizadas, sem que o usuário os forneça diretamente. Para conhecimento atualizado, ferramentas de **Pesquisa na Web** e **MCP** (Model Context Protocol) como o Context7 ajudam os agentes a acessar informações além da data de corte do conhecimento, como novas versões de bibliotecas ou dados atuais que não existiam quando o treinamento parou.

A Pesquisa na Web e ferramentas para consultar contexto atualizado são primitivas úteis para integrar a um harness.

### Batalhando contra a "Podridão do Contexto" (Context Rot)

O desempenho do agente não deve degradar ao longo do trabalho.

A **Podridão do Contexto (Context Rot)** descreve como os modelos se tornam piores em raciocinar e concluir tarefas à medida que sua janela de contexto se enche. O contexto é um recurso precioso e escasso, então os harnesses precisam de estratégias para gerenciá-lo.

Harnesses hoje são, em grande parte, mecanismos de entrega para uma boa engenharia de contexto.

**Compactação** aborda o que fazer quando a janela de contexto está perto de encher. Sem compactação, o que acontece quando uma conversa excede a janela de contexto? Uma opção é que a API dê erro, e isso não é bom. O harness tem que usar alguma estratégia para este caso. Portanto, a compactação descarrega e resume de forma inteligente a janela de contexto existente para que o agente possa continuar trabalhando.

**Descarregamento de chamadas de ferramenta (Tool call offloading)** ajuda a reduzir o impacto de grandes saídas de ferramentas que podem poluir barulhentamente a janela de contexto sem fornecer informações úteis. O harness mantém os tokens de cabeçalho e cauda das saídas de ferramenta acima de um número limite de tokens e descarrega a saída completa para o sistema de arquivos, para que o modelo possa acessá-la se necessário.

**Skills (Habilidades)** abordam o problema de ter muitas ferramentas ou servidores MCP carregados no contexto ao iniciar o agente, o que degrada o desempenho antes que o agente possa começar a trabalhar. Skills são uma primitiva de nível de harness que resolvem isso por meio de **divulgação progressiva** (progressive disclosure). O modelo não escolheu ter as definições front-matter de Skills carregadas no contexto no início, mas o harness pode suportar isso para proteger o modelo contra a podridão do contexto.

### Execução Autônoma de Longo Horizonte

Queremos que agentes completem trabalhos complexos, de forma autônoma, corretamente e em horizontes de tempo longos.

A criação de software autônomo é o Santo Graal para agentes de programação. Mas os modelos de hoje sofrem com paradas precoces (early stopping), problemas na decomposição de problemas complexos e incoerência à medida que o trabalho se estende por múltiplas janelas de contexto. Um bom harness tem que ser projetado em torno de tudo isso.

É aqui que as primitivas de harness mencionadas anteriormente começam a se compor. O trabalho de longo horizonte requer estado durável, planejamento, observação e verificação para continuar funcionando em múltiplas janelas de contexto.

*   **Sistemas de arquivos e git para rastrear trabalho entre sessões.** Agentes produzem milhões de tokens durante uma tarefa longa, então o sistema de arquivos captura duravelmente o trabalho para rastrear o progresso ao longo do tempo. Adicionar o git permite que novos agentes se atualizem rapidamente com os últimos trabalhos e o histórico do projeto. Para vários agentes trabalhando juntos, o sistema de arquivos também atua como um livro-razão (ledger) compartilhado de trabalho onde os agentes podem colaborar.
*   **Ralph Loops para continuar o trabalho.** O *Ralph Loop* é um padrão de harness que intercepta a tentativa de saída do modelo por meio de um hook (gancho) e reinjeta o prompt original em uma janela de contexto limpa, forçando o agente a continuar seu trabalho em relação a um objetivo de conclusão. O sistema de arquivos torna isso possível porque cada iteração começa com contexto fresco, mas lê o estado da iteração anterior.
*   **Planejamento e autoverificação para permanecer no caminho certo.** Planejamento é quando um modelo decompõe um objetivo em uma série de etapas. Harnesses suportam isso através de bons prompts e injetando lembretes de como usar um arquivo de plano no sistema de arquivos. Depois de completar cada passo, os agentes se beneficiam da verificação da correção de seu trabalho através de autoverificação. Hooks em harnesses podem executar um conjunto de testes pré-definido e retornar ao modelo em caso de falha com a mensagem de erro, ou os modelos podem ser instruídos por prompt a autoavaliar seu código independentemente. A verificação fundamenta a solução em testes e cria um sinal de feedback para autoaperfeiçoamento.

## O Futuro dos Harnesses

### O Acoplamento entre Treinamento de Modelos e Design de Harness

Produtos de agentes de hoje, como Claude Code e Codex, são pós-treinados com modelos e harnesses em conjunto (no loop). Isso ajuda os modelos a melhorar em ações nas quais os designers de harness acham que eles devem ser nativamente bons, como operações no sistema de arquivos, execução em bash, planejamento ou paralelização de trabalho com subagentes.

Isso cria um ciclo de feedback. Primitivas úteis são descobertas, adicionadas ao harness e, em seguida, usadas ao treinar a próxima geração de modelos. Conforme esse ciclo se repete, os modelos tornam-se mais capazes dentro do harness no qual foram treinados.

Mas essa coevolução tem efeitos colaterais interessantes para a generalização. Isso aparece em situações como quando a alteração da lógica da ferramenta leva a um pior desempenho do modelo. Um bom exemplo é descrito aqui no guia de prompts do Codex-5.3 com a lógica da ferramenta `apply_patch` para editar arquivos. Um modelo verdadeiramente inteligente deveria ter poucos problemas em alternar entre os métodos de patch, mas treinar com um harness no loop cria esse *overfitting* (sobreajuste).

Mas isso não significa que o melhor harness para sua tarefa seja aquele com o qual um modelo foi pós-treinado. O Terminal Bench 2.0 Leaderboard é um bom exemplo. Opus 4.6 no Claude Code pontua muito abaixo do Opus 4.6 em outros harnesses. Em um blog anterior, mostramos como melhoramos nosso agente de codificação do Top 30 para o Top 5 no Terminal Bench 2.0 alterando apenas o harness. Há muito suco a ser espremido da otimização do harness para sua tarefa.

```text
                ┌──────────────────────────────────────┐
                │          Discover Primitive          │
        ┌─────▶│ e.g. skills, compaction, ralph loops │─────┐
        │      └──────────────────────────────────────┘     │
        │                         │                         │
        │                         │                         │
        │                         ▼                         │
┌──────────────┐         ┌────────────────┐         ┌─────────────────────────┐
│Model Improves│         │     cycle      │         │     Add to Harness      │
│  at using    │         │    repeats     │         │ standardize into product│
│   harness    │         └────────────────┘         └─────────────────────────┐
└──────────────┘                                                    │
        ▲                         │                         │
        │                         │                         │
        │                         ▼                         │
        │      ┌──────────────────────────────────────┐     │
        └──────│          Train Next Model            │◀────┘
               │      with harness in the loop        │
               └──────────────────────────────────────┘
```

### Para Onde a Engenharia de Harness Está Indo

Conforme os modelos se tornam mais capazes, parte do que vive no harness hoje será absorvido pelo modelo. Modelos se tornarão melhores em planejamento, autoverificação e coerência em longo horizonte nativamente, exigindo assim menos injeção de contexto, por exemplo.

Isso sugere que os harnesses devem importar menos ao longo do tempo. Mas assim como a engenharia de prompts continua sendo valiosa hoje, é provável que a engenharia de harness continue sendo útil para construir bons agentes.

É verdade que os harnesses hoje consertam (patch over) as deficiências do modelo, mas eles também projetam sistemas em torno da inteligência do modelo para torná-los mais eficazes. Um ambiente bem configurado, as ferramentas certas, estado durável e loops de verificação tornam qualquer modelo mais eficiente, independentemente de sua inteligência básica.

A engenharia de harness é uma área muito ativa de pesquisa que usamos para melhorar nossa biblioteca de construção de harness `deepagents` na LangChain. Aqui estão alguns problemas em aberto e interessantes que estamos explorando hoje:
* Orquestrar centenas de agentes trabalhando em paralelo em uma base de código compartilhada.
* Agentes que analisam seus próprios rastros (traces) para identificar e corrigir modos de falha no nível do harness.
* Harnesses que montam dinamicamente as ferramentas e o contexto certos de forma just-in-time (na hora exata) para uma determinada tarefa, em vez de serem pré-configurados.

Este blog foi um exercício de definição do que é um harness e como ele é moldado pelo trabalho que queremos que os modelos realizem.

O modelo contém a inteligência e o harness é o sistema que torna essa inteligência útil.

Para mais construção de harnesses, sistemas melhores e agentes melhores.