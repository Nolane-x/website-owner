# Living World v2 — model notes

Living World is a deterministic, discrete-time, agent-based ecology experiment. It is intentionally a compact simulation, not a biological prediction model.

## Reproducibility and boundaries

- A world is initialized from an unsigned 32-bit seed and a deterministic xorshift random stream.
- The horizontal and vertical edges wrap: moving beyond one edge re-enters from the opposite edge.
- The default world is 72 × 44 cells. Dimensions are bounded to 32–90 × 20–60 and at most 5,400 cells.
- At most 420 active organisms are simulated. A generation shuffles the existing agent order before applying actions.
- One generation is one complete environment update and one action opportunity per organism that was alive at the start of that generation. Newborns start acting on the next generation.
- The engine is pure with respect to its input: `stepLivingWorld(world)` creates a new state and does not mutate the supplied world.
- The seed, PRNG state, terrain arrays, organisms, genomes, rules and event history are included in version-2 snapshots. Imports validate lengths, ranges, IDs, positions, genomes and parasite-host links before a state is accepted.

## Terrain, resources and climate

The generated world contains six modeled biomes:

| Biome | Main ecological effect |
| --- | --- |
| Plains | Moderate vegetation and open movement |
| Forest | High vegetation growth and cover |
| Desert | Low moisture and food; higher energetic pressure for grazers |
| Mountain | Low food; impassable to land animals and parasites, while microbes may traverse it |
| Water | River/lake cells; impassable to land agents |
| Wetland | High moisture, fertility and vegetation growth |

A seed-based terrain field creates the initial elevation/moisture pattern. A continuous meandering water corridor is then carved across the map. The terrain brush changes unoccupied cells and resets the local food, fertility, humidity, temperature and elevation fields to that biome's starting profile.

Vegetation is represented as a cell resource with values from 0 to 15, not as individual plant agents. Dead organisms and wildfire damage add detritus, represented by a second 0–15 cell resource. Microbes consume detritus and increase local soil fertility.

The climate uses four seasons, each lasting 80 generations. The seasonal cycle therefore repeats every 320 generations. Weather states are clear, rain, drought, storm, heatwave and wildfire; weather episodes last 8–20 generations. Temperature, humidity and fertility are normalized simulation values, not real Celsius, rainfall or measured soil units.

Vegetation growth depends on biome, season, humidity, temperature, soil fertility and current weather. Wildfire damages forest vegetation and adds some detritus. Drought and heatwaves reduce growth and moisture. This is a simple rule system: it does not solve fluid dynamics, atmospheric circulation, hydrology, fire-front propagation or real climate.

## Organism groups and behaviors

| Group | Primary modeled behavior |
| --- | --- |
| Grazer | Consumes vegetation, remembers a food location, flees nearby hunters/omnivores and may cohere around nearby grazers |
| Hunter | Pursues prey, returns toward its home territory, and competes with nearby hunters whose home territories overlap |
| Omnivore | Consumes vegetation and opportunistically hunts when hungry and sufficiently aggressive |
| Parasite | Attaches to grazers/omnivores, drains host energy, receives energy from the interaction and is affected by host immunity |
| Microbe | Moves over passable ground, consumes detritus and increases soil fertility |

A parasite attached to a host shares the host's coordinates but is not a separate occupying cell. Its host must remain a valid grazer or omnivore. If the host dies, the parasite attempts to detach to an open adjacent cell; otherwise it dies too.

Agents have energy and age budgets. Temperature extremes, dry air for grazers/omnivores, high elevation and severe weather increase modeled metabolic pressure. A low-energy or over-age organism dies and contributes detritus. Food, hunting, parasitism and metabolic cost change energy. Reproduction requires age, energy, an open neighboring cell and a probabilistic fertility check. The global population cap prevents unbounded growth.

## Genome and lineage model

Each organism carries ten numeric traits:

- Metabolism: energy spent per generation.
- Vision: radius used to search for food, prey, threats or hosts.
- Fertility: probability of reproduction after the required conditions are met.
- Speed: high values allow a second movement step when pursuing a target.
- Sociality: controls how strongly grazers use nearby group positions.
- Aggression: affects hunting success and hunter territorial competition.
- Camouflage: reduces prey visibility in the simplified hunting score.
- Immunity: reduces parasite energy transfer from a host.
- Efficiency: changes energy gained from food and detritus.
- Virulence: changes parasite energy extraction from a host.

Offspring inherit the parent's genome with independent bounded random mutations. There is no sexual recombination, chromosomes, Mendelian inheritance, developmental biology or real DNA. When mutation pressure is sufficiently high and a child differs enough from its parent under the configured normalized-trait threshold, the child receives a new lineage ID. Descendants preserve that lineage unless another qualifying branch occurs.

**A lineage branch is not the same as a new biological species.** The current engine does not model reproductive isolation, mate choice, hybridization or a formal species concept. It therefore reports genetic lineage divergence rather than claiming full speciation.

## Research and analysis

- The terrain, food and climate map layers visualize different state arrays.
- Population history samples the five group counts.
- The UI can fast-forward by 100 or 1,000 generations in cancellable chunks, yielding to the browser between chunks and creating intermediate 40-generation checkpoints.
- A 1,000-generation climate-only stress test checks seeded reproducibility, seasonal wraparound and bounded resource values.
- The event log records season/weather changes, births, predation, booms, crashes, extinctions and genetic lineage branches. It retains the most recent 64 events in a snapshot.
- Automatic checkpoints are created at roughly 40-generation intervals; manual checkpoints can be created at any paused state. The browser stores at most 12.
- A checkpoint can be restored as a branch. Named experiments store up to six independent versioned snapshots.
- Comparison shows differences between two saved worlds in population, species counts, resources, births/deaths, lineage diversity and selected mean genome traits.
- Research notes use explicit heuristic thresholds. They are descriptive hints from the current state, not causal inference or statistical significance tests.

All simulation state and research snapshots remain in browser-local storage unless the user explicitly exports a JSON snapshot file. Import validates the file and does not upload it. Clearing browser storage removes these local records.

## Known limitations and next scientific improvements

The model does not currently include individual plant life cycles, photosynthesis budgets, trophic nutrient chemistry, explicit sex/recombination, mate selection, disease transmission between hosts, water flow, fire spread, spatially continuous physics, detailed sensory systems, learned neural policies or formal speciation. It also does not guarantee that a given species survives: extinction is a valid possible outcome under the selected rules.

Useful next research steps are per-species trait histories, controlled parameter sweeps across repeated seeds, stronger model calibration, spatially local nutrient/water transport, plant-agent life cycles, host-to-host parasite transmission and an explicit reproductive-isolation model.
