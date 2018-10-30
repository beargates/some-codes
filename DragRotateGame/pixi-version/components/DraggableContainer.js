import {CustomPIXIComponent} from 'react-pixi-fiber';
import * as PIXI from 'pixi.js';

const TYPE = 'DraggableContainer';
const behavior = {
    customDisplayObject: () => new PIXI.Container(),
    customDidAttach: function (instance) {
        instance.interactive = true;
        instance.cursor = 'pointer';

        let draggedObject = null;
        this.isDragging = false;
        this._dragData_ = {};
        this.pointerUp = (e) => {
            draggedObject = null;
            const event = e.data.originalEvent;
            const {x, y} = e.data.global;
            if (this.isDragging) {
                const deltaX = x - this._dragData_.startPoint.x;
                const deltaY = y - this._dragData_.startPoint.y;

                event.deltaX = deltaX;
                event.deltaY = deltaY;

                if (typeof instance.onDragEnd === 'function') {
                    instance.onDragEnd(e);
                }
                this.isDragging = false;
                this.isDragStartProceed = false;
            } else {
                // 目前没有拖动即为点击
                if (typeof instance.onPointerUp === 'function') {
                    instance.onPointerUp(e);
                }
            }
        };
        this.pointerDown = (e) => {
            draggedObject = instance;
            const {x, y} = e.data.global;
            this._dragData_.startPoint = {x, y};
        };
        this.pointerMove = e => {
            if (draggedObject === null) {
                return;
            }
            const event = e.data.originalEvent;
            const {x, y} = e.data.global;
            const deltaX = x - this._dragData_.startPoint.x;
            const deltaY = y - this._dragData_.startPoint.y;

            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                this.isDragging = true;
            }
            if (this.isDragging && !this.isDragStartProceed) {
                if (typeof instance.onDragStart === 'function') {
                    instance.onDragStart(e);
                }
                this.isDragStartProceed = true;
            }

            event.deltaX = deltaX;
            event.deltaY = deltaY;
            // draggedObject.position.x += e.data.originalEvent.movementX;
            // draggedObject.position.y += e.data.originalEvent.movementY;
            if (this.isDragging) {
                if (typeof instance.onDragMove === 'function') {
                    instance.onDragMove(e);
                }
            }
        };

        instance.on('pointerup', this.pointerUp);
        instance.on('pointerdown', this.pointerDown);
        instance.on('pointermove', this.pointerMove);
    },
    customWillDetach: function (instance) {
        instance.off('pointerup', this.pointerUp);
        instance.off('pointerdown', this.pointerDown);
        instance.off('pointermove', this.pointerMove);
    },
};

export default CustomPIXIComponent(behavior, TYPE);
