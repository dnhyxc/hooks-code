import React from './react';
import ReactDOM from './react-dom';

const style = { border: '2px solid pink', margin: '5px', textAlign: 'center' }

const element = (
  <div id='A1' className='AA' style={style}>
    A
    <div id='B1' style={style}>
      B
      <div id='C1' style={style}>
        c
      </div>
      <div id='C2' style={style}>
        C
      </div>
    </div>
    <div id='B2'>
      D
    </div>
  </div>
);

ReactDOM.render(
  element,
  document.getElementById('root')
);


/*
 * const element = React.createElement(
 *   "div",
 *   {
 *     id: "A1",
 *     style: style
 *   },
 *   "A1",
 *   React.createElement(
 *     "div",
 *     {
 *       id: "B1",
 *       style: style
 *     },
 *     "B1",
 *     React.createElement(
 *       "div",
 *       {
 *         id: "C1",
 *         style: style
 *       },
 *       "C1"
 *     ),
 *     React.createElement(
 *       "div",
 *       {
 *         id: "C2",
 *         style: style
 *       },
 *       "C2"
 *      )
 *   ),
 *   React.createElement(
 *     "div",
 *     {
 *       id: "B2"
 *     },
 *   "B2"
 *   )
 * );
*/