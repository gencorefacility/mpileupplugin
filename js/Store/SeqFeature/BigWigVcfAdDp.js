define([
    'dojo/_base/declare',
    'JBrowse/Util',
    'JBrowse/Store/SeqFeature',
    'JBrowse/Model/CoverageFeature',
    'JBrowse/Model/NestedFrequencyTable',
    'JBrowse/Store/SeqFeature/RegionStatsMixin'
],
function (
    declare,
    Util,
    SeqFeatureStore,
    CoverageFeature,
    NestedFrequencyTable,
    RegionStatsMixin,
) {
/**
     * Return whether 2 interbase coordinate ranges intersect.
     *
     * @param {number} left1
     * @param {number} right1
     * @param {number} left2
     * @param {number} right2
     *
     * @returns {boolean} true if the two ranges intersect
     */
    function intersect0(left1, right1, left2, right2) {
        return right1 > left2 && left1 < right2;
    }
    return declare([SeqFeatureStore, RegionStatsMixin], {
        constructor(args) {
            if (args.bigwig) {
                const conf = args.bigwig;
                const CLASS = dojo.global.require(conf.storeClass);
                const newConf = Object.assign({}, args, conf);
                newConf.config = Object.assign({}, args.config, conf);
                this.bigwig = new CLASS(newConf);
            }
            if (args.vcf) {
                const conf = args.vcf;
                const CLASS = dojo.global.require(conf.storeClass);
                const newConf = Object.assign({}, args, conf);
                newConf.config = Object.assign({}, args.config, conf);
                this.vcf = new CLASS(newConf);
            }
        },

        async getFeatures(query, featureCallback, finishCallback, errorCallback) {
            try {
                const coverageFeats = await new Promise((resolve, reject) => {
                    const features = [];
                    this.bigwig.getFeatures(query,
                        f => features.push(f),
                        () => { resolve(features); },
                        reject
                    );
                });
                const vcfFeats = await new Promise((resolve, reject) => {
                    const features = [];
                    this.vcf.getFeatures(query,
                        f => features.push(f),
                        () => { resolve(features); },
                        reject
                    );
                });
                const val = vcfFeats.length ? [[vcfFeats[0].get('id'), vcfFeats[0]]] : [];
                let currentVcfFeats = new Map(val);
                let curr = 1;
                for (let i = 0; i < coverageFeats.length; i++) {
                    let feat = coverageFeats[i];
                    const rstart = feat.get('start');
                    const rend = feat.get('end');
                    for (let start = rstart; start < rend; start++) {
                        const end = start + 1;
                        const bin = new NestedFrequencyTable();
                        bin.snpsCounted = true;
                        let score = feat.get('score');
                        for (const f of currentVcfFeats.values()) {
                            if (intersect0(f.get('start'), f.get('end'), start, end)) {
                                const genotypes = f.get('genotypes');
                                const genotypeOfInterest = genotypes[Object.keys(genotypes)[0]];
                                const AD = (genotypeOfInterest.AD || {}).values || [];
				const DP = genotypeOfInterest.DP.values

                                const alleles = f.get('alternative_alleles');
                                alleles.values.forEach((allele, index) => {
				    freq = (AD[index + 1] / DP) * score
				    console.log("AD = " + AD + "; DP = " + DP + "; freq = " + freq + "; score = " + score)
                                    score -= freq;
                                    bin.increment(allele, freq || 0);
                                });
                            }
                            if (start > f.get('end') - 1) {
                                currentVcfFeats.delete(f.get('id'));
                                if (curr < vcfFeats.length) {
                                    currentVcfFeats.set(vcfFeats[curr].get('id'), vcfFeats[curr]);
                                    curr++;
                                }
                            }
                        }
                        if (score > 0) {
                            bin.increment('reference', score);
                        }
                        featureCallback(new CoverageFeature({start, end, score: bin}));
                    }
                }
                finishCallback();
            } catch (e) {
                errorCallback(e);
            }
        }
    });
});
