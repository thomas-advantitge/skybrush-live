/**
 * @file OpenLayers interaction that selects the point feature of a layer
 * that is closest to the point where the user clicked (or moved the mouse),
 * along with a convenient React component wrapper.
 */

import _ from 'lodash'
import ol from 'openlayers'
import { interaction } from 'ol-react'
import { PropTypes } from 'react'
import { euclideanDistance } from '../../../utils/geography'

/**
 * OpenLayers interaction that selects the point feature of a layer that is
 * closest to the point where the user clicked (or moved the mouse).
 */
class SelectNearestFeatureInteraction extends ol.interaction.Interaction {
  /**
   * Constructor.
   *
   * The constructor takes a single options object whose keys and values
   * define how the interaction is customized.
   *
   * @param {Object} [options={}]  the options of the interaction
   * @param {ol.Condition} [options.condition=ol.events.condition.singleClick]
   *        the condition that decides whether the interaction should deal
   *        with the event.
   * @param {ol.Condition} [options.addCondition=ol.events.condition.never]
   *        when this condition evaluates to true with the current event,
   *        the interaction will add the nearest feature to the selection
   *        instead of overwriting it
   * @param {ol.Condition} [options.removeCondition=ol.events.condition.never]
   *        when this condition evaluates to true with the current event,
   *        the interaction will remove the nearest feature from the
   *        selection instead of overwriting the selection completely
   * @param {ol.Condition} [options.toggleCondition=ol.events.condition.never]
   *        when this condition evaluates to true with the current event,
   *        the interaction will toggle the nearest feature in the
   *        selection instead of overwriting the selection completely; in
   *        other words, if the feature is already in the selection, it will
   *        be removed, otherwise it will be added
   * @param {Array<ol.layer.Layer>|function(layer: ol.layer.Layer):boolean|undefined}
   *        options.layers  the layers on which the interaction will operate, or
   *        a function that returns true for the layers that the interaction
   *        should operate on. Layers that are hidden will always be ignored.
   * @param {Number|undefined} options.threshold  the distance threshold;
   *        the selection callback will be called only when the distance
   *        between the pixel of the map browser event and the closest feature
   *        is not larger than this value. The default is infinity.
   */
  constructor (options = {}) {
    super({
      handleEvent: mapBrowserEvent => {
        // Check whether the event matches the condition
        if (!this.condition_(mapBrowserEvent)) {
          return true
        }

        // Short-circuit if the user has not specified a callback
        if (!this.select_) {
          return ol.events.condition.pointerMove(mapBrowserEvent)
        }

        // Create the layer selector function if needed
        if (!this.layerSelectorFunction_) {
          this.layerSelectorFunction_ = this.createLayerSelectorFunction_(this.layers_)
        }

        // Find the feature that is closest to the selection, in each
        // matching layer
        const { coordinate, map } = mapBrowserEvent
        const distanceFunction = _.partial(this.distanceOfEventFromFeature_, mapBrowserEvent)
        const closestFeature = _(map.getLayers().getArray())
          .filter(this.isLayerFeasible_)
          .filter(this.layerSelectorFunction_)
          .map(layer => {
            const source = layer.getSource()
            return source
              ? source.getClosestFeatureToCoordinate(coordinate)
              : undefined
          })
          .filter(this.isFeatureFeasible_)
          .minBy(distanceFunction)

        // Get the actual distance of the feature
        const distance = distanceFunction(closestFeature)

        // If the feature is close enough...
        if (distance <= this.threshold_) {
          // Decide whether we are setting, adding, removing or toggling the
          // selection
          const add = this.addCondition_(mapBrowserEvent)
          const remove = this.removeCondition_(mapBrowserEvent)
          const toggle = this.toggleCondition_(mapBrowserEvent)
          const mode = add ? 'add' : (remove ? 'remove' : (toggle ? 'toggle' : 'set'))

          // Now call the callback
          this.select_(mode, closestFeature, distance)
        }

        return ol.events.condition.pointerMove(mapBrowserEvent)
      }
    })

    this.condition_ = options.condition
      ? options.condition : ol.events.condition.singleClick

    this.addCondition_ = options.addCondition
      ? options.addCondition : ol.events.condition.never

    this.removeCondition_ = options.addCondition
      ? options.removeCondition : ol.events.condition.never

    this.toggleCondition_ = options.addCondition
      ? options.toggleCondition : ol.events.condition.never

    this.select_ = options.select

    this.threshold_ = options.threshold
      ? options.threshold : Number.POSITIVE_INFINITY

    this.setLayers(options.layers)
  }

  /**
   * Constructs a layer selector function from the given object.
   *
   * @param {Array<ol.layer.Layer>|function(layer: ol.layer.Layer):boolean|undefined} layers
   *        the layer selector object; either an array of layers that should
   *        be included in the selection or a function that returns true
   *        for layers that should be included in the selection
   * @return {function(layer: ol.layer.Layer):boolean} an appropriate layer
   *         selector function
   */
  createLayerSelectorFunction_ (layers) {
    if (layers) {
      if (_.isFunction(layers)) {
        return layers
      } else if (_.isArray(layers)) {
        return layer => _.includes(layers, layer)
      } else {
        return _.stubFalse
      }
    } else {
      return _.stubTrue
    }
  }

  /**
   * Calculates the distance of a given feature from a given map browser
   * event. The distance will be returned in pixels.
   *
   * @param {ol.MapBrowserEvent}  event    the event
   * @param {ol.Feature}          feature  the feature
   * @return {Number} the distance of the feature from the event, in pixels
   */
  distanceOfEventFromFeature_ (event, feature) {
    const closestPoint = feature.getGeometry().getClosestPoint(event.coordinate)
    const closestPixel = event.map.getPixelFromCoordinate(closestPoint)
    return euclideanDistance(event.pixel, closestPixel)
  }

  /**
   * Returns the associated layer selector of the interaction.
   *
   * @return {Array<ol.layer.Layer>|function(layer: ol.layer.Layer):boolean|undefined}
   *         the layer selector
   */
  getLayers () {
    return this.layers_
  }

  /**
   * Returns whether a given layer is visible and has an associated vector
   * source.
   *
   * @param {ol.layer.Layer} layer  the layer to test
   * @return {boolean} whether the layer is visible and has an associated
   *         vector source
   */
  isLayerFeasible_ (layer) {
    return layer && layer.getVisible() && layer instanceof ol.layer.Vector
  }

  /**
   * Sets the layer selector that defines which layers the interaction will
   * operate on.
   *
   * The layer selector may be a list of layers (i.e. {@link ol.layer.Layer}
   * objects) or a function that will be called with every layer of the
   * map and that must return <code>true</code> for layers that should
   * be handled by the interaction. You may also use <code>undefined</code>,
   * in which case all layers will be included.
   *
   * @param {Array<ol.layer.Layer>|function(layer: ol.layer.Layer):boolean|undefined} value
   *        the new layer selector
   */
  setLayers (value) {
    this.layers_ = value
    this.layerSelectorFunction_ = undefined
  }
}

/**
 * React wrapper around an instance of {@link SelectNearestFeatureInteraction}
 * that allows us to use it in JSX.
 */
export default class SelectNearestFeature extends interaction.OLInteraction {
  createInteraction (props) {
    return new SelectNearestFeatureInteraction(props)
  }
}

SelectNearestFeature.propTypes = Object.assign({}, interaction.OLInteraction.propTypes, {
  addCondition: PropTypes.func,
  layers: PropTypes.oneOfType([
    PropTypes.func, PropTypes.arrayOf(ol.layer.Layer)
  ]),
  removeCondition: PropTypes.func,
  select: PropTypes.func,
  threshold: PropTypes.number,
  toggleCondition: PropTypes.func
})