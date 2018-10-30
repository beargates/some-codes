import React, { Component } from "react";
import ReactDOM from "react-dom";
import {Stage} from 'react-konva';

export default class Container extends Component {
    componentDidMount(){
        const {children, ...rest} = this.props;
        ReactDOM.render( <Stage {...rest}>
            {
                children
            }
        </Stage>, this.container);
    }
    render() {
        return <div
            ref={ref => this.container = ref}
        />;
    }
}

