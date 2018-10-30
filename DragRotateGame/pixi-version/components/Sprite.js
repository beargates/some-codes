import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Sprite} from 'react-pixi-fiber';
import * as PIXI from 'pixi.js';

const pointX = .5;
const pointY = .5;
const centerAnchor = new PIXI.Point(pointX, pointY);

class PIXISprite extends Component {
    render() {
        /**
         * image: {
         *     meta: {width, height},
         *     url: '',
         *     ...
         * }
         */
        const {image, x, y, click, ...rest} = this.props;
        const {
            meta: {
                width,
                height
            }
        } = image;
        return <Sprite
            anchor={centerAnchor}
            // pivot={{x: width / 4, y: height / 4}}
            texture={PIXI.Texture.fromImage(image.url)}
            width={width / 2}
            height={height / 2}
            x={x + width / 2 * pointX}
            y={y + height / 2 * pointY}
            {...rest}
            interactive
        />
    }
}

PIXISprite.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
};
PIXISprite.defaultProps = {
    x: 0,
    y: 0,
};

export default PIXISprite;
