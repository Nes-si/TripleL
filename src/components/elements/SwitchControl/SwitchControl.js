import React, {Component} from 'react';
import CSSModules from 'react-css-modules';

import {getUniqueId} from 'utils/common';

import styles from './SwitchControl.sss';


@CSSModules(styles, {allowMultiple: true})
export default class SwitchControl extends Component {
  state = {
    checked: false
  };
  id = getUniqueId();
  
  constructor(props) {
    super(props);
    
    this.state.checked = props.checked;
  }
  
  componentWillReceiveProps (nextProps) {
    this.setState({checked: nextProps.checked});
  }
  
  onChange = e => {
    const {onChange, disabled} = this.props;
    if (onChange && !disabled)
      onChange(e.target.checked);
  };
  
  render() {
    const {label, disabled} = this.props;
    let style = `SwitchControl`;
    if (this.state.checked === undefined)
      style += ` undefined`;
    if (disabled)
      style += ` disabled`;
    
    return (
      <div styleName={style}>
        <input type="checkbox"
               styleName="checkbox"
               id={this.id}
               disabled={disabled}
               checked={!!this.state.checked}
               onChange={this.onChange}
        />
        <label styleName="label" htmlFor={this.id}>{label}</label>
      </div>
    );
  }
}
