import React from 'react';
import {Image} from 'react-konva';

const getOutline = ({blob: {url}, meta: {width, height}}) => {
    return new Promise((res) => {
        let image = new window.Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            width = Math.round(width / 2);
            height = Math.round(height / 2);

            canvas.width = width;
            canvas.height = height;
            ctx.width = width;
            ctx.height = height;
            ctx.drawImage(image, 0, 0, width, height);

            res(canvas);
        };

        image.src = url;
    });
};

export default class KonvaImage extends React.Component {
    state = {
        image: null
    };

    componentDidMount() {
        getOutline(this.props.image).then((image) => {
            this.setState({image});
        });
    }

    render() {
        const {image, children, ...rest} = this.props;
        return <Image image={this.state.image} {...rest}/>;
    }
}