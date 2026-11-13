# Yeo Jian Ming A0301639H MP4 Reflections

My contributions to this project include all of the "Developer"-relevant features, like creating projects, accepting and managing bug reports, and generating potential follow up questions for testers.

## Reflection

I learnt a lot from my first initial experience with Multi-Agent SE in MP3. While I had separate agents defined in MP3, I had went with a generic Coordinator workflow. With MP4, I sought to optimise and improve upon this workflow by setting out concrete steps and a path for the main coordinator agent to ensure the workflow follows. 

### Taking Advantage of Parallel Work

In MP3, while I had separate Tester and Implementer agents, I did not make good use of one of the benfits of having a Multi-Agent workflow, which was parallelism. Since I had still instructed the coordinator to do TDD, the Tester subagent would run first, creating the necessary test cases, and only then would the Implementer subagent start writing code. This was a huge waste of time and not maximising the potential of working with multiple agents.

Since I had wanted to parallelise, a traditional TDD, where concrete test cases were written before functional code, would not suffice. However I still needed a way for both subagents to agree on what functions would eventually be written and agree on them so that there would not be a mismatch in the application functions, and the test code. Hence I had instructed the main coordinator agent to define "interface contracts" that defined the name, parameters and expected functionality of the planned function, this way both my Implementer and Tester subagents can be run at the same time.

In the process of designing my multi-agent workflow, I learnt that it was important to balance utilisation of your agents with the correctness of code. This is because code review typically is the most expensive part of an agentic workflow, both in terms of time and tokens. Code review necessitates having a dedicated independent review subagent read through all the changes made, as well as running any and all test cases to ensure proper checks. Aspiring to have all your different subagents run at the same time to optimise time spent is not worth it as some tasks naturally depend on others to conclude before beginning.

An example of this is my documentation-writer subagent. I initially wanted to have the documentation be updated alongside my functional code and test cases, so that the entire workflow would largely consist of three stages, delegation -> work -> review. However, it was not impossible for a bug or a misimplementation to be found by the reviewer during the reviewing process, which might result in specification plan changes, and subsequently code and test case changes. This meant that any documentation written might have to be rewritten and re-reviewed again as well, which would ultimately result in a large waste of tokens.

### Dedicated UI Subagent

In the middle of development, I had also added a new ui_polisher subagent that would read the current frontend-relevant files and adjust styles or placements as necessary to aid with cleaner UI. This was because in the earlier stages of development, I brushed over requiring a clean UI and focused more on proper functionality. However, I then decided that it was good to incorporate proper UI into my workflow as I went along. I had two choices, one where I updated the requirements and instructions for my current existing Implementer subagent, having it check UI as it implemented code, or I could define a new subagent to handle UI

I ultimately decided to have a fresh agent perform UI changes as I considered what lived in the context of my Implementer subagent, and that was the required functionality of the code. While UI changes would read and edit similar files, I decided that the task scope was too different from what the Implementer was originally made to do, and thus decided a new UI agent was more appropriate.

Of course this did not come without drawbacks. The UI agent would need to be barred from accessing code until the implementer was finished, and that meant it would need to wait until the functionality was stable and approved by the reviewer before it was able to work.

### Subagent Model Parameters

Researching about the details of Codex's models showed that Astra was their most powerful but also most expensive model in terms of token usage, and that Sol was a more reasonable balanced option for regular tasks. With this in mind, I initially had my Implementer and Tester subagents use the balanced Sol model while my reviewer used the Astra model. This made sense in my head at the time as the reasoning workload of writing code or test cases from a predefined specification is much lesser than that of a reviewer's workload, who needed to check for correctness across all changes. The reviewing process also served as a safety net to stop any bugs from finding their way through, and thus would warrant the use of a more advanced model.

However after my first feature implementation, I was not satisfied with the amount of tokens that were being consumed. Simply planning and implementing one feature drained my entire five hour budget. I then decided to rethink if having my reviewer subagent run on Astra was worth it. While the reviewing process was important, ensuring basic correctness of the code was something that was well within the capabilities of other less powerful but still modern models as well. Thus I decided to downgrade my reviewer from Astra to Sol, but having its reasoning effort be on `medium`.

This improved my token consumption a lot, and did not introduce any glaring uncaught bugs in my application either. While it is true that the reviewer's check passed on the first attempt more often than previously, the bugs that were caught by the Astra reviewer included requiring the URL format verifier to catch for Zero Width Joiners or Non Joiners in the input URL string, which while useful, is not common in regular operations of the product. Naturally, the scope of this project alone is not enough to determine if using Sol or Astra is more worth it but the lesson to be learned here is that the parameters of the model should be appropriately scaled to the scale of the project. While of course in a world where tokens are free and limitless, having all subagents be run on the highest end models would be a no-brainer, some trade-offs have to be made in reality to achieve a balanced and optimal workflow.

### Directory-Based `AGENTS.md`

One of my first desired goals before writing code for MP4 was to improve on the workflow used in MP3. In MP3, we had used a large `AGENTS.md` document that was carried over from MP2. This meant that every detail about the project resided in `AGENTS.md` and when we transitioned into a Multi-Agent workflow, every time a subagent was spawned, in addition to the context provided to it by the Main agent, it would re-read `AGENTS.md` again.

This was a glaring issue. I experimented with splitting up the information within `AGENTS.md` into separate files, keeping only repository wide information resident within it, like information about the application, the project structure, as well as broad definitions of the workflow. While more specialised information, like Test Case Design, Code Quality, Documentation guidelines and the Detailed Multi-Agent workflow were placed into separate files that were linked to within the main `AGENTS.md`, instructing the relevant subagents to only read the relevant files before beginning work.

I had also tested this splitting of context and instructions in a separate quick experiment I performed where I had two identical repositories set up, only difference being that once had a large AGENTS.md file and the other was fragmented. Agents in both repositories were asked to perform the same task and the tokens consumed were counted manually from their session `.jsonl` files. The results showed that the repository that had the separated `AGENTS.md` file consumed about 20% less tokens, while producing the same functional operation.


