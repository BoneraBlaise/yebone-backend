const InteriorProvider = require("./InteriorProvider");

/** Interior placement — wall art, window, floor previews */
class InteriorPlacementProvider extends InteriorProvider {
  constructor(config = {}) {
    super(config);
    this.id = "interior_placement";
    this.category = "interior_placement";
    this.model = config.model || "yebo-interior-placement-mock-v1";
  }
}

module.exports = InteriorPlacementProvider;
