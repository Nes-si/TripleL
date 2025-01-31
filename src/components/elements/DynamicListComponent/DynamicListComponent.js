import React, {Component} from 'react';
import CSSModules from 'react-css-modules';

import InputControl from 'components/elements/InputControl/InputControl';
import InputNumberControl from 'components/elements/InputNumberControl/InputNumberControl';

import styles from './DynamicListComponent.sss';


@CSSModules(styles, {allowMultiple: true})
export default class DynamicListComponent extends Component {
  state = {
    values: this.props.values ? this.props.values : []
  };
  inputs = [];

  static getDerivedStateFromProps(props, state) {
    let {values} = props;
    if (!values)
      values = [];
    return {values};
  }
  
  onKeyDown = (event, i) => {
    event.stopPropagation();
  
    const code = event.keyCode;
    
    //Enter or down pressed
    if (code == 13 || code == 40) {
      if (this.inputs[i + 1])
        this.inputs[i + 1].focus();
      else
        this.onPlus(i);
      
    //Up pressed
    } else if (code == 38) {
      if (i)
        this.inputs[--i].focus();
    }
  };
  
  onPlus = (i = 0) => {
    if (this.props.readOnly)
      return;
    
    let values = this.state.values ? this.state.values : [''];
    let valuesLeft = values.slice(0, i + 1);
    let valuesRight = values.slice(i + 1);
    values = valuesLeft.concat('', valuesRight);

    this.props.onChange(values);
  };
  
  onMinus = i => {
    if (this.props.readOnly)
      return;
    
    let values = this.state.values.slice();
    values.splice(i, 1);
    this.setState({values});
    this.props.onChange(values);
  };
  
  onChange = (value, i) => {
    const values = this.state.values.slice();
    values[i] = value;
    this.setState({values});
    this.props.onChange(values);
  };
  
  isFocused() {
    for (let input of this.inputs) {
      if (input === document.activeElement)
        return true;
    }
    return false;
  }
  
  render() {
    const {disableEmpty, readOnly, numeric, numericInt} = this.props;
    
    let values = disableEmpty ? [''] : [];
    if (this.state.values.length)
      values = this.state.values;
  
    this.inputs = [];
    
    if (values.length) {
      const elements = [];
      
      for (let i = 0; i < values.length; i++) {
        let input;
        if (numeric)
          input = <InputNumberControl isInt={numericInt}
                                      value={values[i]}
                                      readOnly={readOnly}
                                      onChange={v => this.onChange(v, i)}
                                      DOMRef={inp => this.inputs[i] = inp}
                                      onKeyDown={e => this.onKeyDown(e, i)}/>;
        else
          input = <InputControl value={values[i]}
                                readOnly={readOnly}
                                DOMRef={inp => this.inputs[i] = inp}
                                onChange={v => this.onChange(v, i)}
                                onKeyDown={e => this.onKeyDown(e, i)}/>;
        
        elements.push(
          <div styleName="item"
               key={i}>
            {input}
            {!readOnly &&
              <div styleName="item-plus"
                   onClick={() => this.onPlus(i)}>
                +
              </div>
            }
            {(!readOnly && (i > 0 || !disableEmpty)) &&
              <div styleName="item-minus"
                   onClick={() => this.onMinus(i)}>
                –
              </div>
            }
          </div>
        );
      }
      
      return <div>{elements}</div>;
    
    } else {
      return (
        <div>
          <div styleName="plus"
               onClick={() => this.onPlus()}>
            List is empty. Add element?
          </div>
        </div>
      );
    }
  }
}
