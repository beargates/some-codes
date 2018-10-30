import React from 'react';
import PropTypes from 'prop-types';
import Hammer from '../../../../component/Hammer';

import './draggable-area.less';

export default class DraggableArea extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        className: PropTypes.string,
        style: PropTypes.object,
        onDrag: PropTypes.func,
        onDragStart: PropTypes.func,
        onDragEnd: PropTypes.func
    }
    static defaultProps = {
        onDrag: () => {
        },
        onDragStart: () => {
        },
        onDragEnd: () => {
        },
        className: '',
        children: null,
        style: {}
    }
    state = {}

    onPan(e) {
        this.props.onDrag(e);
        e.preventDefault();
    }

    onPanStart(e) {
        this.props.onDragStart(e);
        e.preventDefault();
    }

    onPanEnd(e) {
        this.props.onDragEnd(e);
        e.preventDefault();
    }

    onTap(e) {
        this.props.onTap(e);
    }

    render() {
        const {style} = this.props;
        return <Hammer
            onTap={this.onTap.bind(this)}
            onPan={this.onPan.bind(this)}
            onPanEnd={this.onPanEnd.bind(this)}
            onPanStart={this.onPanStart.bind(this)}
            direction="DIRECTION_ALL"
        >
            <div className="draggable-container" style={style}>
                {this.props.children}
            </div>
        </Hammer>;
    }
}