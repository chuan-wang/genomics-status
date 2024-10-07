
const vElementApp = {
    data() {
        return {
            ngi_run_id: "some_id",
            flowcell: {},
            flowcell_fetched: false,
        }
    },
    computed: {
        instrument_generated_files() {
            return this.getValue(this.flowcell, "instrument_generated_files", {});
        },
        aviti_run_stats() {
            return this.getValue(this.instrument_generated_files, "AvitiRunStats.json", {});
        },
        run_stats() {
            return this.getValue(this.aviti_run_stats, "RunStats", {});
        },
        demultiplex_stats() {
            return this.getValue(
                this.getValue(this.flowcell, "Element", {}),
                "Demultiplex_Stats", {}
            );
        },
        index_assignment_demultiplex() {
            return this.getValue(this.demultiplex_stats, "Index_Assignment", {});
        },
        index_assignment_instrument() {
            return this.getValue(this.run_stats, "IndexAssignment", {});
        },
        unassiged_sequences_demultiplex() {
            return this.getValue(this.demultiplex_stats, "Unassigned_Sequences", {});
        }
    },
    methods: {
        getValue(obj, key, defaultValue = "N/A") {
            if (obj === null || obj == undefined || obj === "N/A") {
                return defaultValue;
            }
            return obj.hasOwnProperty(key) ? obj[key] : defaultValue;
        },
        formatNumberBases(number) {
            if (number === "N/A") {
                return "N/A";
            } else if (number < 1000000) {
                return number + " bp";
            } else if (number < 1000000000) {
                return (number / 1000000).toFixed(2) + " Mbp";
            } else {
                return (number / 1000000000).toFixed(2) + " Gbp";
            }
        }
    }
}

const app = Vue.createApp(vElementApp);


app.component('v-element-flowcell', {
    props: ['ngi_run_id'],
    computed: {
        flowcell() {
            return this.$root.flowcell;
        },
        instrument_generated_files() {
            return this.$root.instrument_generated_files;
        },
        aviti_run_stats() {
            return this.$root.aviti_run_stats;
        },
        run_parameters() {
            return this.$root.getValue(this.instrument_generated_files, "RunParameters.json", {});
        },
        start_time() {
            const dateStr = this.$root.getValue(this.run_parameters, "Date", null);
            if (dateStr) {
                const date = new Date(dateStr);
                const date_string = date.toLocaleDateString();
                const [day, month, year] = date_string.split("/");
                const date_formatted = `${year}-${month}-${day}`;
                return `${date_formatted} ${date.toLocaleTimeString()}`;
            } else {
                return "N/A";
            }
        },
        flowcell_id() {
            return this.$root.getValue(this.run_parameters, "FlowcellID");
        },
        side() {
            return this.$root.getValue(this.run_parameters, "Side");
        },
        instrument_name() {
            return this.$root.getValue(this.run_parameters, "InstrumentName");
        },
        run_setup() {
            return `${this.chemistry_version} ${this.kit_configuration} (${this.cycles}); ${this.throughput_selection}`;
        },
        cycles() {
            const cycles = this.$root.getValue(this.run_parameters, "Cycles", {});
            if (cycles === "N/A") {
                return "N/A";
            }
            let return_str = "";
            if (cycles.hasOwnProperty("R1")) {
                return_str += "R1: " + cycles["R1"];
            }
            if (cycles.hasOwnProperty("R2")) {
                return_str += ", R2: " + cycles["R2"];
            }
            if (cycles.hasOwnProperty("I1")) {
                return_str += ", I1: " + cycles["I1"];
            }
            if (cycles.hasOwnProperty("I2")) {
                return_str += ", I2: " + cycles["I2"];
            }
            return return_str;
        },
        throughput_selection() {
            return this.$root.getValue(this.run_parameters, "ThroughputSelection", "N/A") + " Throughput";
        },
        kit_configuration() {
            return this.$root.getValue(this.run_parameters, "KitConfiguration");
        },
        preparation_workflow() {
            return this.$root.getValue(this.run_parameters, "PreparationWorkflow");
        },
        chemistry_version() {
            return this.$root.getValue(this.run_parameters, "ChemistryVersion");
        }
    },
    mounted() {
        this.getFlowcell();
    },
    methods: {
        getFlowcell() {
            axios.get("/api/v1/element_flowcell/" + this.ngi_run_id)
                .then(response => {
                    this.$root.flowcell = response.data;
                    this.$root.flowcell_fetched = true;
                })
                .catch(error => {
                    console.log(error);
                });
        },

    },
    template: /*html*/`
    <div v-if="!this.$root.flowcell_fetched">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <span class="ml-2">Loading...</span>
    </div>
    <div v-else>
        <div class="row">
            <h1>Element BioSciences (AVITI) run <span id="page_title">{{ flowcell["NGI_run_id"]}}</span></h1>
            <div class="col-3">
                <table class="table table-bordered narrow-headers" id="element_fc_info">
                    <tr class="darkth">
                        <th>NGI Run ID</th>
                        <td>{{ flowcell["NGI_run_id"] }}</td>
                    </tr>
                    <tr class="darkth">
                        <th>Start time</th>
                        <td>{{ this.start_time }}</td>
                    </tr>
                    <tr class="darkth">
                        <th>Flowcell ID</th>
                        <td>{{ flowcell_id }}</td>
                    </tr>
                    <tr class="darkth">
                        <th>Side</th>
                        <td>{{ side }}</td>
                    </tr>
                    <tr class="darkth">
                        <th>Instrument</th>
                        <td>{{ instrument_name }}</td>
                    </tr>
                    <tr class="darkth">
                        <th>Run setup</th>
                        <td>{{ run_setup }}</td>
                    </tr>
                </table>
            </div>
        </div>

        <h2>Summary Run Stats</h2>
        <v-element-run-stats></v-element-run-stats>

        <div class="tabbable mb-3">
            <ul class="nav nav-tabs">
                <li class="nav-item">
                    <a class="nav-link active" href="#tab_lane_stats" role="tab" data-toggle="tab">Lane stats</a>
                </li>
                <li class="nav-item">
                <a class="nav-link" href="#tab_lane_stats_pre_demultiplex" role="tab" data-toggle="tab">Lane Stats (Pre-demultiplex)</a>
                </li>
                <li class="nav-item">
                <a class="nav-link" href="#tab_fc_project_yields_content" role="tab" data-toggle="tab">Project Yields</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#tab_element_quality_graph" role="tab" data-toggle="tab">Cycle Qualities</a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="tab_lane_stats">
                <v-element-lane-stats></v-element-lane-stats>
            </div>
            <div class="tab-pane fade show" id="tab_lane_stats_pre_demultiplex">
                <v-element-lane-stats-pre-demultiplex></v-element-lane-stats-pre-demultiplex>
            </div>
            <div class="tab-pane fade show" id="tab_fc_project_yields_content">
                <h3>Project Yields</h3>
                <p>To be implemented</p>
            </div>
            <div class="tab-pane fade show" id="tab_element_quality_graph">
                <v-element-quality-graph></v-element-quality-graph>
            </div>
        </div>
    </div>

    `
});

app.component('v-element-run-stats', {
    computed: {
        aviti_run_stats() {
            return this.$root.aviti_run_stats;
        },
        run_stats() {
            return this.$root.run_stats;
        },
        polony_count() {
            return this.$root.getValue(this.run_stats, "PolonyCount");
        },
        pf_count() {
            return this.$root.getValue(this.run_stats, "PFCount");
        },
        percent_pf() {
            return this.$root.getValue(this.run_stats, "PercentPF");
        },
        total_yield() {
            return this.$root.getValue(this.run_stats, "TotalYield");
        },
        total_yield_formatted() {
            return this.$root.formatNumberBases(this.$root.getValue(this.run_stats, "TotalYield"));
        },
        index_assignment() {
            return this.$root.index_assignment;
        },
        percent_assigned_reads() {
            return this.$root.getValue(this.index_assignment, "PercentAssignedReads");
        }
    },
    template: `
        <table class="table table-bordered narrow-headers no-margin right_align_headers">
            <tbody>
                <tr class="darkth">
                    <th>Total Yield</th>
                    <v-element-tooltip :title=total_yield>
                        <td>{{ total_yield_formatted }}</td>
                    </v-element-tooltip>
                    <th>Polony Count</th>
                    <td>{{ polony_count }}</td>
                    <th>PF Count</th>
                    <td>{{ pf_count }}</td>
                    <th>% PF</th>
                    <td>{{ percent_pf }}</td>
                    <th>% Assigned Reads</th>
                    <td>{{ percent_assigned_reads }}</td>
                </tr>
            </tbody>
        </table>
        `
});

app.component('v-element-lane-stats', {
    computed: {
        lane_stats() {
            const groupedByLane = {};
            if (this.$root.index_assignment_demultiplex && this.$root.index_assignment_demultiplex.length > 0) {
                this.$root.index_assignment_demultiplex.forEach(sample => {
                    const lane = sample["Lane"];
                    if (!groupedByLane[lane]) {
                        groupedByLane[lane] = [];
                    }
                    groupedByLane[lane].push(sample);
                });
            }

            return groupedByLane;
        },
        unassigned_lane_stats() {
            const groupedByLane = {};

            if (this.$root.unassiged_sequences_demultiplex && this.$root.unassiged_sequences_demultiplex.length > 0) {
                this.$root.unassiged_sequences_demultiplex.forEach(sample => {
                    const lane = sample["Lane"];
                    if (!groupedByLane[lane]) {
                        groupedByLane[lane] = [];
                    }
                    groupedByLane[lane].push(sample);
                });
            }
            return groupedByLane;
        },
        phiX_lane_stats_combined()  {
            /* Sum % Polonies and Count for each lane */
            const groupedByLane = {};

            if (this.$root.index_assignment_demultiplex && this.$root.index_assignment_demultiplex.length > 0) {
                this.$root.index_assignment_demultiplex.forEach((sample) => {
                    if (sample["SampleName"] === "PhiX") {
                        const lane = sample["Lane"];
                        if (!groupedByLane[lane]) {
                            groupedByLane[lane] = {
                                "SampleName": "PhiX",
                                "NumPoloniesAssigned": 0,
                                "PercentPoloniesAssigned": 0,
                                "Yield(Gb)": 0,
                                "Lane": lane,
                                "sub_demux_count": new Set(),
                                "PercentMismatch": [],
                                "PercentQ30": [],
                                "PercentQ40": [],
                                "QualityScoreMean": []
                            }
                        }
                        groupedByLane[lane]["NumPoloniesAssigned"] += parseFloat(sample["NumPoloniesAssigned"]);
                        groupedByLane[lane]["PercentPoloniesAssigned"] += parseFloat(sample["PercentPoloniesAssigned"]);
                        groupedByLane[lane]["Yield(Gb)"] += parseFloat(sample["Yield(Gb)"]);
                        groupedByLane[lane]["sub_demux_count"].add(sample["sub_demux_count"]);
                        groupedByLane[lane]["PercentMismatch"].push(sample["PercentMismatch"] * sample["NumPoloniesAssigned"]);
                        groupedByLane[lane]["PercentQ30"].push(sample["PercentQ30"] * sample["NumPoloniesAssigned"]);
                        groupedByLane[lane]["PercentQ40"].push(sample["PercentQ40"] * sample["NumPoloniesAssigned"]);
                        groupedByLane[lane]["QualityScoreMean"].push(sample["QualityScoreMean"] * sample["NumPoloniesAssigned"]);
                    }
                })
            }


            // Calculate the summary stat
            Object.entries(groupedByLane).forEach(([laneKey, lane]) => {
                lane["PercentMismatch"] = lane["PercentMismatch"].reduce((a, b) => a + b, 0) / lane["NumPoloniesAssigned"];
                lane["PercentQ30"] = lane["PercentQ30"].reduce((a, b) => a + b, 0) / lane["NumPoloniesAssigned"];
                lane["PercentQ40"] = lane["PercentQ40"].reduce((a, b) => a + b, 0) / lane["NumPoloniesAssigned"];
                lane["QualityScoreMean"] = lane["QualityScoreMean"].reduce((a, b) => a + b, 0) / lane["NumPoloniesAssigned"];
            })
            
            return groupedByLane;
        },
        unassigned_lane_stats_combined() {
            /* Sum % Polonies and Count for each lane */
            const groupedByLane = {};
            if (this.$root.unassiged_sequences_demultiplex && this.$root.unassiged_sequences_demultiplex.length > 0) {
                this.$root.unassiged_sequences_demultiplex.forEach(unassigned_index => {
                    const lane = unassigned_index["Lane"];
                    if (!groupedByLane[lane]) {
                        groupedByLane[lane] = {
                            "% Polonies": 0,
                            "Count": 0
                        };
                    }
                    groupedByLane[lane]["% Polonies"] += parseFloat(unassigned_index["% Polonies"]);
                    groupedByLane[lane]["Count"] += parseFloat(unassigned_index["Count"]);
                });
            }

            return groupedByLane;
        }
    },
    methods: {
        barcode(sample) {
            var barcode_str = "";
            if (sample.hasOwnProperty("I1") && sample["I1"] !== "") {
                barcode_str += sample["I1"];
            } else {
                barcode_str += "N/A"
            }

            if (sample.hasOwnProperty("I2") && sample["I2"] !== ""){
                barcode_str += "+" + sample["I2"];
            }
            return barcode_str;
        }
    },
    template: /*html*/`
        <div v-for="laneKey in Object.keys(lane_stats)" class="mb-3">
            <h2>
                Lane {{ laneKey }}
            </h2>


            <table class="table table-bordered narrow-headers no-margin right_align_headers">
                <thead>
                    <tr class="darkth">
                        <th>Sample Name</th>
                        <th>Yield (Gb)</th>
                        <th>Num Polonies Assigned</th>
                        <th>% Q30</th>
                        <th>% Q40</th>
                        <th>Barcode(s)</th>
                        <th>% Assigned Reads</th>
                        <th>% Assigned With Mismatches</th>
                        <th>Sub Demux Count</th>
                        <th>Quality Score Mean</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="sample in lane_stats[laneKey]" :key="sample.SampleNumber">
                        <template v-if="sample['SampleName'] !== 'PhiX'">
                            <td>{{ sample["SampleName"] }}</td>
                            <td>{{ sample["Yield(Gb)"] }}</td>
                            <td>{{ sample["NumPoloniesAssigned"] }}</td>
                            <td>{{ parseFloat(sample["PercentQ30"]).toFixed(2) }}</td>
                            <td>{{ parseFloat(sample["PercentQ40"]).toFixed(2) }}</td>
                            <td style="font-size: 1.35rem;"><samp>{{ barcode(sample) }}</samp></td>
                            <td>{{ parseFloat(sample["PercentPoloniesAssigned"]).toFixed(2) }}</td>
                            <td>{{ parseFloat(sample["PercentMismatch"]).toFixed(2) }}</td>
                            <td>{{ sample["sub_demux_count"] }}</td>
                            <td>{{ parseFloat(sample["QualityScoreMean"]).toFixed(2) }}</td>
                        </template>
                    </tr>
                    <tr>
                        <td>PhiX</td>
                        <td>{{ phiX_lane_stats_combined[laneKey]["Yield(Gb)"] }}</td>
                        <td>{{ phiX_lane_stats_combined[laneKey]["NumPoloniesAssigned"] }}</td>
                        <td>{{ parseFloat(phiX_lane_stats_combined[laneKey]["PercentQ30"]).toFixed(2) }}</td>
                        <td>{{ parseFloat(phiX_lane_stats_combined[laneKey]["PercentQ40"]).toFixed(2) }}</td>
                        <td>PhiX</td>
                        <td>{{ parseFloat(phiX_lane_stats_combined[laneKey]["PercentPoloniesAssigned"]).toFixed(2) }}</td>
                        <td>{{ parseFloat(phiX_lane_stats_combined[laneKey]["PercentMismatch"]).toFixed(2) }}</td>
                        <td>{{ phiX_lane_stats_combined[laneKey]["sub_demux_count"] }}</td>
                        <td>{{ parseFloat(phiX_lane_stats_combined[laneKey]["QualityScoreMean"]).toFixed(2) }}</td>
                    </tr>
                    <tr>
                        <td>Unassigned</td>
                        <td>N/A</td>
                        <td>{{ unassigned_lane_stats_combined[laneKey]["Count"] }}</td>
                        <td>N/A</td>
                        <td>N/A</td>
                        <td>N/A</td>
                        <td>{{ parseFloat(unassigned_lane_stats_combined[laneKey]["% Polonies"]).toFixed(2) }}</td>
                        <td>N/A</td>
                        <td>N/A</td>
                        <td>N/A</td>
                    </tr>
                </tbody>
            </table>

            <button class="btn btn-info my-2" type="button" data-toggle="collapse" :data-target="'#collapseUndeterminedLane'+ laneKey" aria-expanded="false" :aria-controls="'#collapseUndeterminedLane'+ laneKey">
                Show undetermined
            </button>
            <div class="collapse mt-3" :id="'collapseUndeterminedLane'+ laneKey">
                <div class="row">
                    <div class="card card-body">
                        <div class="col-3">
                            <table class="table table-bordered narrow-headers no-margin right_align_headers">
                                <thead>
                                    <tr class="darkth">
                                        <th>Sequence</th>
                                        <th>% Occurence</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="unassigned_item in this.unassigned_lane_stats[laneKey]">
                                        <td style="font-size: 1.35rem;"><samp>{{ barcode(unassigned_item)}}</samp></td>
                                        <td>{{ unassigned_item["% Polonies"] }}</td>
                                        <td>{{ unassigned_item["Count"] }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `

});

app.component('v-element-lane-stats-pre-demultiplex', {
    computed: {
        lane_stats() {
            return this.$root.getValue(this.$root.aviti_run_stats, "LaneStats", {});
        },
        lanes() {
            return this.$root.getValue(this.lane_stats, "Lanes", []);
        },
    },
    methods: {
        total_lane_yield(lane) {
            return this.$root.formatNumberBases(this.$root.getValue(lane, "TotalYield"));
        },
        total_lane_yield_formatted(lane) {
            return this.$root.formatNumberBases(this.$root.getValue(lane, "TotalYield"));
        },
        index_assignments(lane) {
            return this.$root.getValue(lane, "IndexAssignment", {});
        },
        percent_assigned_reads(lane) {
            return this.$root.getValue(this.index_assignments(lane), "PercentAssignedReads", {});
        },
        index_samples(lane) {
            return this.$root.getValue(this.index_assignments(lane), "IndexSamples", {});
        },
        unassigned_sequences(lane) {
            return this.$root.getValue(this.index_assignments(lane), "UnassignedSequences", {});
        }
    },
    template: /*html*/`
        <div v-for="lane in lane_stats" class="mb-3">
            <h2>
                Lane {{ lane["Lane"] }}
                <span class="badge rounded-pill bg-warning">Pre-demultiplexing</span>
            </h2>
            <table class="table table-bordered narrow-headers no-margin right_align_headers">
                <tbody>
                    <tr class="darkth">
                        <th>Total Yield</th>
                        <v-element-tooltip :title=lane["TotalYield"]>
                        <td>
                            {{ total_lane_yield_formatted(lane) }}
                        </td>
                        </v-element-tooltip>
                        <th>Polony Count</th> <td>{{ lane["PolonyCount"] }}</td>
                        <th>PF Count</th> <td>{{ lane["PFCount"] }}</td>
                        <th>% PF</th> <td>{{ lane["PercentPF"] }}</td>
                        <th>% Assigned Reads</th> <td>{{ percent_assigned_reads(lane) }}</td>
                    </tr>
                </tbody>
            </table>

            <h3>Index Assignments</h3>
            <table class="table table-bordered narrow-headers no-margin right_align_headers">
                <thead>
                    <tr class="darkth">
                        <th>Project Name</th>
                        <th>Sample Name</th>
                        <th>% Assigned Reads</th>
                        <th>% Assigned With Mismatches</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="sample in index_samples(lane)">
                        <td>{{ sample["ProjectName"] }}</td>
                        <td>{{ sample["SampleName"] }}</td>
                        <td>{{ sample["PercentAssignedReads"] }}</td>
                        <td>{{ sample["PercentMismatch"] }}</td>
                    </tr>
                </tbody>
            </table>

            <button class="btn btn-info my-2" type="button" data-toggle="collapse" :data-target="'#collapseUndeterminedLane'+ lane['Lane']" aria-expanded="false" :aria-controls="'#collapseUndeterminedLane'+ lane['Lane']">
                Show undetermined
            </button>

            <div class="collapse mt-3" :id="'collapseUndeterminedLane'+ lane['Lane']">
                <div class="row">
                <div class="card card-body">
                    <div class="col-3">
                        <table class="table table-bordered narrow-headers no-margin right_align_headers">
                            <thead>
                                <tr class="darkth">
                                    <th>Sequence</th>
                                    <th>% Occurence</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="unassigned_item in unassigned_sequences(lane)">
                                    <td>{{ unassigned_item["I1"] }}+{{ unassigned_item["I2"]}}</td>
                                    <td>{{ unassigned_item["PercentOcurrence"] }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        `

});

app.component('v-element-tooltip', {
    props: ['title'],
    mounted() {
        this.$nextTick(function() {
            this.tooltip = new bootstrap.Tooltip(this.$el)
        })
    },
    template: `
        <span
            data-toggle="tooltip"
            data-placement="top"
            :title=title
        >
            <slot></slot>
        </span>
    `
});

app.component('v-element-quality-graph', {
    data() {
        return {
            include_R1: true,
            include_R2: true,
            graph_warnings: [],
            filter_first_cycles: 1,
            filter_last_cycles: 1,
        }
    },
    computed: {
        flowcell() {
            return this.$root.flowcell;
        },
        reads() {
            return this.$root.getValue(this.$root.run_stats, "Reads", []);
        },
        R1_read_cycles() {
            let filtered_values = this.reads.filter(read => read['Read'] == 'R1')
            if (filtered_values.length === 0) {
                return [];
            }

            return this.$root.getValue(filtered_values[0], 'Cycles', [])
        },
        R2_read_cycles() {
            let filtered_values = this.reads.filter(read => read['Read'] == 'R2')
            if (filtered_values.length === 0) {
                return [];
            }

            return this.$root.getValue(filtered_values[0], 'Cycles', [])
        },
        categories() {
            // Check if R1 is in end_filter
            var categories_R1 = this.R1_read_cycles.map(cycle => `Cycle ${cycle.Cycle}`);

            var categories_R2 = this.R2_read_cycles.map(cycle => `Cycle ${cycle.Cycle}`);

            if (categories_R1.length !== categories_R2.length) {
                console.log("The lengths of categories_R1 and categories_R2 are different.");
                console.log("Length of categories_R1:", categories_R1.length);
                console.log("Length of categories_R2:", categories_R2.length);
            }
            var categories_differ = false;
            for (let i = 0; i < Math.max(categories_R1.length, categories_R2.length); i++) {
                if (categories_R1[i] !== categories_R2[i]) {
                    categories_differ = true;
                    console.log(`Difference found at index ${i}:`);
                    console.log(`categories_R1[${i}]:`, categories_R1[i]);
                    console.log(`categories_R2[${i}]:`, categories_R2[i]);
                }
            }

            if (categories_differ) {
                this.graph_warnings.push("Warning! R1 and R2 x-axis are note identical, using R1 axis");
            }

            return categories_R1;
        },
    },
    methods: {
        summary_graph() {
            if (this.categories.length === 0) {
                return;
            }
            /* Filter the first categories */
            var filtered_categories = this.categories.slice(this.filter_first_cycles);

            /* filter the last categories */
            /* The last value seems to be weird for quality */
            if (this.filter_last_cycles > 0) {
                filtered_categories = filtered_categories.slice(0, -this.filter_last_cycles);
            }

            let R1_percentQ30 = [];
            let R1_percentQ40 = [];
            let R1_averageQScore = [];
            let series = [];
            let avg_series = [];

            if (this.include_R1) {
                R1_percentQ30 = this.R1_read_cycles.map(cycle => cycle.PercentQ30);
                R1_percentQ40 = this.R1_read_cycles.map(cycle => cycle.PercentQ40);
                R1_averageQScore = this.R1_read_cycles.map(cycle => cycle.AverageQScore);

                /* Filter the first values */
                R1_percentQ30 = R1_percentQ30.slice(this.filter_first_cycles);
                R1_percentQ40 = R1_percentQ40.slice(this.filter_first_cycles);
                R1_averageQScore = R1_averageQScore.slice(this.filter_first_cycles);

                /* Filter the last values */
                if (this.filter_last_cycles > 0) {
                    R1_percentQ30 = R1_percentQ30.slice(0, -this.filter_last_cycles);
                    R1_percentQ40 = R1_percentQ40.slice(0, -this.filter_last_cycles);
                    R1_averageQScore = R1_averageQScore.slice(0, -this.filter_last_cycles);
                }

                series.push({
                    name: 'R1 Percent Q30',
                    data: R1_percentQ30,
                })

                series.push(
                {
                    name: 'R1 Percent Q40',
                    data: R1_percentQ40
                })

                avg_series.push(
                {
                    name: 'R1 Average Q Score',
                    data: R1_averageQScore
                })
            }

            let R2_percentQ30 = [];
            let R2_percentQ40 = [];
            let R2_averageQScore = [];

            if (this.include_R2) {
                R2_percentQ30 = this.R2_read_cycles.map(cycle => cycle.PercentQ30);
                R2_percentQ40 = this.R2_read_cycles.map(cycle => cycle.PercentQ40);
                R2_averageQScore = this.R2_read_cycles.map(cycle => cycle.AverageQScore);

                /* Filter the first values */
                R2_percentQ30 = R2_percentQ30.slice(this.filter_first_cycles);
                R2_percentQ40 = R2_percentQ40.slice(this.filter_first_cycles);
                R2_averageQScore = R2_averageQScore.slice(this.filter_first_cycles);

                /* Filter the last values */
                if (this.filter_last_cycles > 0) {
                    R2_percentQ30 = R2_percentQ30.slice(0, -this.filter_last_cycles);
                    R2_percentQ40 = R2_percentQ40.slice(0, -this.filter_last_cycles);
                    R2_averageQScore = R2_averageQScore.slice(0, -this.filter_last_cycles);
                }

                series.push({
                    name: 'R2 Percent Q30',
                    data: R2_percentQ30,
                    dashStyle: 'Dash' // Set dash style for R2 series
                });

                series.push({
                    name: 'R2 Percent Q40',
                    data: R2_percentQ40,
                    dashStyle: 'Dash' // Set dash style for R2 series
                });

                avg_series.push({
                    name: 'R2 Average Q Score',
                    data: R2_averageQScore,
                    dashStyle: 'Dash' // Set dash style for R2 series
                });
            }

            Highcharts.chart('SummaryPlotPercentQuality', {
                chart: {
                    type: 'spline'
                },
                title: {
                    text: '% Quality'
                },
                xAxis: {
                    categories: filtered_categories
                },
                yAxis: [{
                    title: {
                        text: 'Percent Q30/Q40'
                    },
                    opposite: false // Primary y-axis on the left
                }, {
                    title: {
                        text: 'Average Q Score'
                    },
                    opposite: true // Secondary y-axis on the right
                }],
                series: series.map(s => ({
                    ...s,
                    marker: {
                        enabled: false, // Set to false to hide markers
                    }
                }))
            })

            Highcharts.chart('SummaryPlotAvgQuality', {
                chart: {
                    type: 'spline'
                },
                title: {
                    text: 'Average Quality Score'
                },
                xAxis: {
                    categories: filtered_categories
                },
                yAxis: {
                    title: {
                        text: 'Average Q Score'
                    },
                },
                series: avg_series.map(s => ({
                    ...s,
                    marker: {
                        enabled: false, // Set to false to hide markers
                    }
                }))
            });
        },
    },
    mounted() {
        this.$nextTick(function() {
            if (this.$root.flowcell_fetched) { 
                this.summary_graph();
            }
        });
    },
    watch: {
        include_R1: function() {
            this.summary_graph();
        },
        include_R2: function() {
            this.summary_graph();
        },
        filter_first_cycles: function() {
            this.summary_graph();
        },
        filter_last_cycles: function() {
            this.summary_graph();
        }
    },
    template: /*html*/`
    <div class="mx-5">
        <div v-if="graph_warnings.length > 0" class="alert alert-warning" role="alert">
            <ul>
                <li v-for="warning in graph_warnings">{{ warning }}</li>
            </ul>
        </div>
        <div class="row">
            <div class="col-6">
                <div id="SummaryPlotPercentQuality">
                </div>
            </div>
            <div class="col-6">
                <div id="SummaryPlotAvgQuality">
                </div>
            </div>
        </div>
        <div class="row my-3 mx-5">
            <div class="col-3">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" v-model="include_R1" id="include_R1_switch">
                    <label class="form-check-label" for="include_R1_switch">
                        Include R1
                    </label>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" v-model="include_R2" id="include_R2_switch">
                    <label class="form-check-label" for="include_R2_switch">
                        Include R2
                    </label>
                </div>
            </div>
            <div class="col-3">
                <label for="filter_first_cycles" class="form-label">Filter first {{filter_first_cycles}} cycles</label>
                <input type="range" class="form-range" min="0" :max="" v-model="filter_first_cycles" id="filter_first_cycles">

                <label for="filter_last_cycles" class="form-label">Filter last {{filter_last_cycles}} cycles</label>
                <input type="range" class="form-range" min="0" :max="" v-model="filter_last_cycles" id="filter_last_cycles">
            </div>
        </div>
    </div>

    `
});

app.mount("#element_vue_app");